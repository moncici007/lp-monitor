const db = require('../client');

// 更新或创建小时级别的分析数据
async function upsertHourlyAnalytics(analyticsData) {
  const {
    pairAddress,
    hourTimestamp,
    transactionCount,
    volumeToken0,
    volumeToken1,
    volumeUsd,
    largeTransactionsCount,
    liquidityAddCount,
    liquidityRemoveCount,
    netLiquidityToken0,
    netLiquidityToken1,
    priceHigh,
    priceLow,
    priceOpen,
    priceClose,
  } = analyticsData;

  const query = `
    INSERT INTO analytics (
      pair_address, hour_timestamp, transaction_count,
      volume_token0, volume_token1, volume_usd,
      large_transactions_count, liquidity_add_count, liquidity_remove_count,
      net_liquidity_token0, net_liquidity_token1,
      price_high, price_low, price_open, price_close
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (pair_address, hour_timestamp)
    DO UPDATE SET
      transaction_count = analytics.transaction_count + EXCLUDED.transaction_count,
      volume_token0 = analytics.volume_token0 + EXCLUDED.volume_token0,
      volume_token1 = analytics.volume_token1 + EXCLUDED.volume_token1,
      volume_usd = analytics.volume_usd + EXCLUDED.volume_usd,
      large_transactions_count = analytics.large_transactions_count + EXCLUDED.large_transactions_count,
      liquidity_add_count = analytics.liquidity_add_count + EXCLUDED.liquidity_add_count,
      liquidity_remove_count = analytics.liquidity_remove_count + EXCLUDED.liquidity_remove_count,
      net_liquidity_token0 = analytics.net_liquidity_token0 + EXCLUDED.net_liquidity_token0,
      net_liquidity_token1 = analytics.net_liquidity_token1 + EXCLUDED.net_liquidity_token1,
      price_high = GREATEST(analytics.price_high, EXCLUDED.price_high),
      price_low = LEAST(analytics.price_low, EXCLUDED.price_low),
      price_close = EXCLUDED.price_close,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return await db.queryOne(query, [
    pairAddress,
    hourTimestamp,
    transactionCount || 0,
    volumeToken0 || '0',
    volumeToken1 || '0',
    volumeUsd || '0',
    largeTransactionsCount || 0,
    liquidityAddCount || 0,
    liquidityRemoveCount || 0,
    netLiquidityToken0 || '0',
    netLiquidityToken1 || '0',
    priceHigh,
    priceLow,
    priceOpen,
    priceClose,
  ]);
}

// 获取交易对的历史分析数据
async function getAnalyticsByPair(pairAddress, hours = 24) {
  const query = `
    SELECT * FROM analytics
    WHERE pair_address = $1
      AND hour_timestamp > NOW() - INTERVAL '${hours} hours'
    ORDER BY hour_timestamp DESC
  `;
  return await db.queryMany(query, [pairAddress]);
}

// 获取热门交易对（按交易量排序）
async function getTopPairsByVolume(limit = 10, hours = 24) {
  const query = `
    SELECT 
      pair_address,
      SUM(volume_usd) as total_volume_usd,
      SUM(transaction_count) as total_transactions,
      SUM(large_transactions_count) as total_large_transactions
    FROM analytics
    WHERE hour_timestamp > NOW() - INTERVAL '${hours} hours'
    GROUP BY pair_address
    ORDER BY total_volume_usd DESC
    LIMIT $1
  `;
  return await db.queryMany(query, [limit]);
}

module.exports = {
  upsertHourlyAnalytics,
  getAnalyticsByPair,
  getTopPairsByVolume,
};

