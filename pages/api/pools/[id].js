const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    // 获取池子基本信息
    const poolQuery = `
      SELECT * FROM pools WHERE id = $1
    `;
    const poolResult = await query(poolQuery, [id]);

    if (poolResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Pool not found' 
      });
    }

    const pool = poolResult.rows[0];

    // 获取 24 小时统计
    const stats24hQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN event_type = 'swap' THEN usd_value END), 0) as volume_24h,
        COALESCE(COUNT(*), 0) as tx_count_24h,
        COALESCE(COUNT(CASE WHEN event_type = 'swap' THEN 1 END), 0) as swap_count_24h,
        COALESCE(COUNT(CASE WHEN event_type = 'mint' THEN 1 END), 0) as add_liquidity_count_24h,
        COALESCE(COUNT(CASE WHEN event_type = 'burn' THEN 1 END), 0) as remove_liquidity_count_24h,
        MIN(timestamp) as first_tx_time,
        MAX(timestamp) as last_tx_time
      FROM transactions
      WHERE pool_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'
    `;
    const stats24h = await query(stats24hQuery, [id]);

    // 获取价格信息（从最近的交易中）
    const priceQuery = `
      SELECT price, timestamp
      FROM transactions
      WHERE pool_id = $1 AND price IS NOT NULL AND price > 0
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const priceResult = await query(priceQuery, [id]);

    // 获取小时统计（最近 24 小时）
    const hourlyStatsQuery = `
      SELECT 
        hour_timestamp,
        volume_usd,
        tx_count,
        price_close,
        price_high,
        price_low
      FROM hourly_stats
      WHERE pool_id = $1 
        AND hour_timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY hour_timestamp ASC
    `;
    const hourlyStats = await query(hourlyStatsQuery, [id]);

    // 计算价格变化
    let priceChange24h = 0;
    if (hourlyStats.rows.length > 1) {
      const firstPrice = parseFloat(hourlyStats.rows[0].price_close || 0);
      const lastPrice = parseFloat(hourlyStats.rows[hourlyStats.rows.length - 1].price_close || 0);
      if (firstPrice > 0) {
        priceChange24h = ((lastPrice - firstPrice) / firstPrice) * 100;
      }
    }

    // 组装响应数据
    const response = {
      success: true,
      pool: {
        ...pool,
        reserve0: parseFloat(pool.reserve0 || 0),
        reserve1: parseFloat(pool.reserve1 || 0),
        liquidity: parseFloat(pool.liquidity || 0),
        current_price: priceResult.rows.length > 0 ? parseFloat(priceResult.rows[0].price) : 0,
        price_updated_at: priceResult.rows.length > 0 ? priceResult.rows[0].timestamp : null
      },
      stats_24h: {
        volume: parseFloat(stats24h.rows[0].volume_24h || 0),
        tx_count: parseInt(stats24h.rows[0].tx_count_24h || 0),
        swap_count: parseInt(stats24h.rows[0].swap_count_24h || 0),
        add_liquidity_count: parseInt(stats24h.rows[0].add_liquidity_count_24h || 0),
        remove_liquidity_count: parseInt(stats24h.rows[0].remove_liquidity_count_24h || 0),
        first_tx_time: stats24h.rows[0].first_tx_time,
        last_tx_time: stats24h.rows[0].last_tx_time,
        price_change_percentage: priceChange24h
      },
      hourly_stats: hourlyStats.rows.map(row => ({
        timestamp: row.hour_timestamp,
        volume: parseFloat(row.volume_usd || 0),
        tx_count: parseInt(row.tx_count || 0),
        price_close: parseFloat(row.price_close || 0),
        price_high: parseFloat(row.price_high || 0),
        price_low: parseFloat(row.price_low || 0)
      }))
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('获取池子详情失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch pool details',
      message: error.message 
    });
  }
}

