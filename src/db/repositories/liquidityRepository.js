const db = require('../client');

// 创建流动性事件
async function createLiquidityEvent(eventData) {
  const {
    pairAddress,
    transactionHash,
    blockNumber,
    eventType,
    sender,
    recipient,
    amount0,
    amount1,
    liquidity,
    amountUsd,
    timestamp,
    logIndex = 0, // 添加 logIndex 参数，默认为 0
  } = eventData;

  const query = `
    INSERT INTO liquidity_events (
      pair_address, transaction_hash, block_number, event_type,
      sender, recipient, amount0, amount1, liquidity, amount_usd, timestamp, log_index
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (transaction_hash, log_index) DO NOTHING
    RETURNING *
  `;

  return await db.queryOne(query, [
    pairAddress,
    transactionHash,
    blockNumber,
    eventType,
    sender,
    recipient,
    amount0,
    amount1,
    liquidity,
    amountUsd,
    timestamp,
    logIndex,
  ]);
}

// 获取最近的流动性事件
async function getRecentLiquidityEvents(pairAddress, limit = 50) {
  const query = `
    SELECT * FROM liquidity_events
    WHERE pair_address = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `;
  return await db.queryMany(query, [pairAddress, limit]);
}

// 获取指定时间范围的流动性变化统计
async function getLiquidityStatsByTimeRange(pairAddress, startTime, endTime) {
  const query = `
    SELECT 
      event_type,
      COUNT(*) as event_count,
      SUM(amount0) as total_amount0,
      SUM(amount1) as total_amount1,
      SUM(amount_usd) as total_usd
    FROM liquidity_events
    WHERE pair_address = $1
      AND timestamp >= $2
      AND timestamp <= $3
    GROUP BY event_type
  `;
  return await db.queryMany(query, [pairAddress, startTime, endTime]);
}

// 获取最近1小时的流动性变化
async function getHourlyLiquidityStats(pairAddress) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = new Date();
  return await getLiquidityStatsByTimeRange(pairAddress, oneHourAgo, now);
}

// 获取所有交易对的最近流动性事件
async function getAllRecentLiquidityEvents(limit = 100, hoursAgo = 24) {
  const query = `
    SELECT le.*, p.token0_address, p.token1_address
    FROM liquidity_events le
    JOIN pairs p ON le.pair_address = p.address
    WHERE le.timestamp > NOW() - INTERVAL '${hoursAgo} hours'
    ORDER BY le.timestamp DESC
    LIMIT $1
  `;
  return await db.queryMany(query, [limit]);
}

module.exports = {
  createLiquidityEvent,
  getRecentLiquidityEvents,
  getLiquidityStatsByTimeRange,
  getHourlyLiquidityStats,
  getAllRecentLiquidityEvents,
};

