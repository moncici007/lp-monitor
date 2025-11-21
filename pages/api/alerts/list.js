const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      is_read,
      alert_type,
      limit = 50,
      offset = 0 
    } = req.query;

    // 构建查询
    let sql = `
      SELECT 
        a.*,
        t.tx_hash,
        t.event_type,
        t.timestamp as tx_timestamp,
        p.chain,
        p.dex,
        p.pool_address,
        p.token0_symbol,
        p.token1_symbol
      FROM large_trade_alerts a
      LEFT JOIN transactions t ON a.transaction_id = t.id
      JOIN pools p ON a.pool_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // 添加过滤条件
    if (is_read !== undefined) {
      sql += ` AND a.is_read = $${paramCount}`;
      params.push(is_read === 'true');
      paramCount++;
    }

    if (alert_type) {
      sql += ` AND a.alert_type = $${paramCount}`;
      params.push(alert_type);
      paramCount++;
    }

    // 排序和分页
    sql += ` ORDER BY a.created_at DESC`;
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // 格式化预警数据
    const alerts = result.rows.map(alert => ({
      id: alert.id,
      alert_type: alert.alert_type,
      pool_id: alert.pool_id,
      chain: alert.chain,
      dex: alert.dex,
      pool_address: alert.pool_address,
      pair: `${alert.token0_symbol}/${alert.token1_symbol}`,
      transaction_id: alert.transaction_id,
      tx_hash: alert.tx_hash,
      event_type: alert.event_type,
      usd_value: parseFloat(alert.usd_value || 0),
      threshold_usd: parseFloat(alert.threshold_usd || 0),
      is_read: alert.is_read,
      notified: alert.notified,
      tx_timestamp: alert.tx_timestamp,
      created_at: alert.created_at
    }));

    // 获取未读数量
    const unreadCountQuery = `
      SELECT COUNT(*) as unread_count
      FROM large_trade_alerts
      WHERE is_read = false
    `;
    const unreadResult = await query(unreadCountQuery);
    const unreadCount = parseInt(unreadResult.rows[0].unread_count);

    res.status(200).json({
      success: true,
      count: alerts.length,
      unread_count: unreadCount,
      offset: parseInt(offset),
      limit: parseInt(limit),
      alerts
    });

  } catch (error) {
    console.error('获取预警列表失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch alerts',
      message: error.message 
    });
  }
}

