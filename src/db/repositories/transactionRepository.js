const db = require('../client');

// 创建交易记录
async function createTransaction(txData) {
  const {
    pairAddress,
    transactionHash,
    blockNumber,
    sender,
    recipient,
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
    amountUsd,
    isLarge,
    gasPrice,
    gasUsed,
    timestamp,
    logIndex = 0, // 添加 logIndex 参数，默认为 0
  } = txData;

  const query = `
    INSERT INTO transactions (
      pair_address, transaction_hash, block_number, sender, recipient,
      amount0_in, amount1_in, amount0_out, amount1_out,
      amount_usd, is_large, gas_price, gas_used, timestamp, log_index
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (transaction_hash, log_index) DO NOTHING
    RETURNING *
  `;

  return await db.queryOne(query, [
    pairAddress,
    transactionHash,
    blockNumber,
    sender,
    recipient,
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
    amountUsd,
    isLarge,
    gasPrice,
    gasUsed,
    timestamp,
    logIndex,
  ]);
}

// 获取交易对的最近交易
async function getRecentTransactions(pairAddress, limit = 50) {
  const query = `
    SELECT * FROM transactions
    WHERE pair_address = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `;
  return await db.queryMany(query, [pairAddress, limit]);
}

// 获取大额交易
async function getLargeTransactions(limit = 50, hoursAgo = 24) {
  const query = `
    SELECT t.*, p.token0_address, p.token1_address
    FROM transactions t
    JOIN pairs p ON t.pair_address = p.address
    WHERE t.is_large = true 
      AND t.timestamp > NOW() - INTERVAL '${hoursAgo} hours'
    ORDER BY t.timestamp DESC
    LIMIT $1
  `;
  return await db.queryMany(query, [limit]);
}

// 获取指定时间范围内的交易量
async function getVolumeByTimeRange(pairAddress, startTime, endTime) {
  const query = `
    SELECT 
      COUNT(*) as transaction_count,
      SUM(amount0_in + amount0_out) as volume_token0,
      SUM(amount1_in + amount1_out) as volume_token1,
      SUM(amount_usd) as volume_usd,
      COUNT(CASE WHEN is_large THEN 1 END) as large_transaction_count
    FROM transactions
    WHERE pair_address = $1
      AND timestamp >= $2
      AND timestamp <= $3
  `;
  return await db.queryOne(query, [pairAddress, startTime, endTime]);
}

// 获取最近1小时的交易统计
async function getHourlyStats(pairAddress) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = new Date();
  return await getVolumeByTimeRange(pairAddress, oneHourAgo, now);
}

module.exports = {
  createTransaction,
  getRecentTransactions,
  getLargeTransactions,
  getVolumeByTimeRange,
  getHourlyStats,
};

