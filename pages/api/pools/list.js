const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chain, sortBy = 'volume_24h', limit = 50 } = req.query;

    // 构建查询
    let sql = `
      SELECT 
        p.*,
        COALESCE(SUM(CASE 
          WHEN t.timestamp > NOW() - INTERVAL '24 hours' AND t.event_type = 'swap'
          THEN t.usd_value 
          ELSE 0 
        END), 0) as volume_24h,
        COALESCE(COUNT(CASE 
          WHEN t.timestamp > NOW() - INTERVAL '24 hours' 
          THEN t.id 
        END), 0) as tx_count_24h,
        COALESCE(COUNT(CASE 
          WHEN t.timestamp > NOW() - INTERVAL '1 hour' 
          THEN t.id 
        END), 0) as tx_count_1h
      FROM pools p
      LEFT JOIN transactions t ON p.id = t.pool_id
    `;

    const params = [];
    
    // 如果指定了链，添加过滤条件
    if (chain) {
      sql += ` WHERE p.chain = $1 AND p.is_active = true`;
      params.push(chain);
    } else {
      sql += ` WHERE p.is_active = true`;
    }

    sql += ` GROUP BY p.id`;

    // 排序
    const validSortFields = ['volume_24h', 'tx_count_24h', 'updated_at', 'liquidity'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'volume_24h';
    sql += ` ORDER BY ${sortField} DESC NULLS LAST`;

    // 限制
    sql += ` LIMIT ${parseInt(limit)}`;

    const result = await query(sql, params);

    // 计算额外的统计信息
    const pools = result.rows.map(pool => {
      const price = pool.reserve1 && pool.reserve0 
        ? parseFloat(pool.reserve1) / parseFloat(pool.reserve0)
        : 0;

      return {
        ...pool,
        current_price: price,
        reserve0: parseFloat(pool.reserve0 || 0),
        reserve1: parseFloat(pool.reserve1 || 0),
        liquidity: parseFloat(pool.liquidity || 0),
        volume_24h: parseFloat(pool.volume_24h || 0),
        tx_count_24h: parseInt(pool.tx_count_24h || 0),
        tx_count_1h: parseInt(pool.tx_count_1h || 0)
      };
    });

    res.status(200).json({
      success: true,
      count: pools.length,
      pools
    });

  } catch (error) {
    console.error('获取池子列表失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch pools',
      message: error.message 
    });
  }
}

