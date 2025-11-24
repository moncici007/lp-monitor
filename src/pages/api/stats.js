const db = require('../../db/client');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 获取总体统计数据
    const [
      pairCount,
      transactionCount24h,
      liquidityEventCount24h,
      unreadAlertCount,
    ] = await Promise.all([
      db.queryOne('SELECT COUNT(*) as count FROM pairs'),
      db.queryOne(
        "SELECT COUNT(*) as count FROM transactions WHERE timestamp > NOW() - INTERVAL '24 hours'"
      ),
      db.queryOne(
        "SELECT COUNT(*) as count FROM liquidity_events WHERE timestamp > NOW() - INTERVAL '24 hours'"
      ),
      db.queryOne('SELECT COUNT(*) as count FROM alerts WHERE is_read = false'),
    ]);

    // 获取最近1小时的活动
    const recentActivity = await db.queryOne(`
      SELECT 
        COUNT(DISTINCT t.pair_address) as active_pairs,
        COUNT(t.id) as transactions,
        COUNT(CASE WHEN t.is_large THEN 1 END) as large_transactions
      FROM transactions t
      WHERE t.timestamp > NOW() - INTERVAL '1 hour'
    `);

    res.status(200).json({
      success: true,
      data: {
        totalPairs: parseInt(pairCount.count),
        transactions24h: parseInt(transactionCount24h.count),
        liquidityEvents24h: parseInt(liquidityEventCount24h.count),
        unreadAlerts: parseInt(unreadAlertCount.count),
        lastHour: {
          activePairs: parseInt(recentActivity.active_pairs),
          transactions: parseInt(recentActivity.transactions),
          largeTransactions: parseInt(recentActivity.large_transactions),
        },
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
    });
  }
}

