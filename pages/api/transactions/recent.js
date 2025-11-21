const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      pool_id, 
      chain,
      event_type,
      limit = 50,
      offset = 0 
    } = req.query;

    // 构建查询
    let sql = `
      SELECT 
        t.*,
        p.chain,
        p.dex,
        p.pool_address,
        p.token0_symbol,
        p.token1_symbol
      FROM transactions t
      JOIN pools p ON t.pool_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // 添加过滤条件
    if (pool_id) {
      sql += ` AND t.pool_id = $${paramCount}`;
      params.push(pool_id);
      paramCount++;
    }

    if (chain) {
      sql += ` AND p.chain = $${paramCount}`;
      params.push(chain);
      paramCount++;
    }

    if (event_type) {
      sql += ` AND t.event_type = $${paramCount}`;
      params.push(event_type);
      paramCount++;
    }

    // 排序和分页
    sql += ` ORDER BY t.timestamp DESC`;
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // 格式化交易数据
    const transactions = result.rows.map(tx => ({
      id: tx.id,
      pool_id: tx.pool_id,
      chain: tx.chain,
      dex: tx.dex,
      pool_address: tx.pool_address,
      pair: `${tx.token0_symbol}/${tx.token1_symbol}`,
      tx_hash: tx.tx_hash,
      block_number: tx.block_number,
      event_type: tx.event_type,
      amount0_in: parseFloat(tx.amount0_in || 0),
      amount1_in: parseFloat(tx.amount1_in || 0),
      amount0_out: parseFloat(tx.amount0_out || 0),
      amount1_out: parseFloat(tx.amount1_out || 0),
      sender: tx.sender,
      recipient: tx.recipient,
      usd_value: parseFloat(tx.usd_value || 0),
      price: parseFloat(tx.price || 0),
      timestamp: tx.timestamp
    }));

    // 获取总数（用于分页）
    let countSql = `
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN pools p ON t.pool_id = p.id
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamNum = 1;
    
    if (pool_id) {
      countSql += ` AND t.pool_id = $${countParamNum}`;
      countParams.push(pool_id);
      countParamNum++;
    }

    if (chain) {
      countSql += ` AND p.chain = $${countParamNum}`;
      countParams.push(chain);
      countParamNum++;
    }

    if (event_type) {
      countSql += ` AND t.event_type = $${countParamNum}`;
      countParams.push(event_type);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      offset: parseInt(offset),
      limit: parseInt(limit),
      transactions
    });

  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message 
    });
  }
}

