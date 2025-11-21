const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chain } = req.query;

    // 构建链过滤条件
    const chainFilter = chain ? 'AND p.chain = $1' : '';
    const params = chain ? [chain] : [];

    // 获取总体统计
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_pools,
        COUNT(DISTINCT CASE WHEN p.chain = 'bsc' THEN p.id END) as bsc_pools,
        COUNT(DISTINCT CASE WHEN p.chain = 'solana' THEN p.id END) as solana_pools,
        COUNT(CASE WHEN t.timestamp > NOW() - INTERVAL '24 hours' THEN t.id END) as tx_24h,
        COUNT(CASE WHEN t.timestamp > NOW() - INTERVAL '1 hour' THEN t.id END) as tx_1h,
        COALESCE(SUM(CASE WHEN t.timestamp > NOW() - INTERVAL '24 hours' AND t.event_type = 'swap' THEN t.usd_value END), 0) as volume_24h,
        COALESCE(SUM(CASE WHEN t.timestamp > NOW() - INTERVAL '1 hour' AND t.event_type = 'swap' THEN t.usd_value END), 0) as volume_1h
      FROM pools p
      LEFT JOIN transactions t ON p.id = t.pool_id
      WHERE p.is_active = true ${chainFilter}
    `;

    const summaryResult = await query(summaryQuery, params);
    const summary = summaryResult.rows[0];

    // 获取监控状态
    const statusQuery = `
      SELECT chain, is_running, last_sync_time, error_count, last_error
      FROM monitor_status
      ORDER BY chain
    `;
    const statusResult = await query(statusQuery);

    // 获取最活跃的池子（按 24 小时交易量）
    const topPoolsQuery = `
      SELECT 
        p.id,
        p.chain,
        p.dex,
        p.pool_address,
        p.token0_symbol,
        p.token1_symbol,
        COUNT(t.id) as tx_count,
        COALESCE(SUM(CASE WHEN t.event_type = 'swap' THEN t.usd_value END), 0) as volume
      FROM pools p
      LEFT JOIN transactions t ON p.id = t.pool_id AND t.timestamp > NOW() - INTERVAL '24 hours'
      WHERE p.is_active = true ${chainFilter}
      GROUP BY p.id
      ORDER BY volume DESC
      LIMIT 5
    `;
    const topPoolsResult = await query(topPoolsQuery, params);

    // 获取未读预警数量
    const alertsQuery = `
      SELECT 
        COUNT(*) as unread_alerts,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as new_alerts_1h
      FROM large_trade_alerts
      WHERE is_read = false
    `;
    const alertsResult = await query(alertsQuery);

    res.status(200).json({
      success: true,
      summary: {
        total_pools: parseInt(summary.total_pools || 0),
        bsc_pools: parseInt(summary.bsc_pools || 0),
        solana_pools: parseInt(summary.solana_pools || 0),
        tx_24h: parseInt(summary.tx_24h || 0),
        tx_1h: parseInt(summary.tx_1h || 0),
        volume_24h: parseFloat(summary.volume_24h || 0),
        volume_1h: parseFloat(summary.volume_1h || 0)
      },
      monitor_status: statusResult.rows.map(s => ({
        chain: s.chain,
        is_running: s.is_running,
        last_sync_time: s.last_sync_time,
        error_count: s.error_count,
        last_error: s.last_error
      })),
      top_pools: topPoolsResult.rows.map(p => ({
        id: p.id,
        chain: p.chain,
        dex: p.dex,
        pool_address: p.pool_address,
        pair: `${p.token0_symbol}/${p.token1_symbol}`,
        tx_count: parseInt(p.tx_count || 0),
        volume: parseFloat(p.volume || 0)
      })),
      alerts: {
        unread_count: parseInt(alertsResult.rows[0].unread_alerts || 0),
        new_1h: parseInt(alertsResult.rows[0].new_alerts_1h || 0)
      }
    });

  } catch (error) {
    console.error('获取统计摘要失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch summary',
      message: error.message 
    });
  }
}

