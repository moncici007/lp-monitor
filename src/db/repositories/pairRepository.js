const db = require('../client');

// 创建交易对
async function createPair(pairData) {
  const {
    address,
    token0Address,
    token1Address,
    blockNumber,
    transactionHash,
  } = pairData;

  const query = `
    INSERT INTO pairs (
      address, token0_address, token1_address, 
      block_number, transaction_hash
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (address) DO NOTHING
    RETURNING *
  `;

  return await db.queryOne(query, [
    address,
    token0Address,
    token1Address,
    blockNumber,
    transactionHash,
  ]);
}

// 更新交易对储备量
async function updatePairReserves(address, reserve0, reserve1, totalSupply) {
  const query = `
    UPDATE pairs 
    SET reserve0 = $2, reserve1 = $3, total_supply = $4, updated_at = CURRENT_TIMESTAMP
    WHERE address = $1
    RETURNING *
  `;

  return await db.queryOne(query, [address, reserve0, reserve1, totalSupply]);
}

// 获取交易对
async function getPairByAddress(address) {
  const query = `
    SELECT p.*, 
           t0.symbol as token0_symbol, t0.decimals as token0_decimals,
           t1.symbol as token1_symbol, t1.decimals as token1_decimals
    FROM pairs p
    LEFT JOIN tokens t0 ON p.token0_address = t0.address
    LEFT JOIN tokens t1 ON p.token1_address = t1.address
    WHERE p.address = $1
  `;
  return await db.queryOne(query, [address]);
}

// 获取最新的交易对列表
async function getRecentPairs(limit = 50, offset = 0) {
  const query = `
    SELECT p.*, 
           t0.symbol as token0_symbol, t0.name as token0_name,
           t1.symbol as token1_symbol, t1.name as token1_name
    FROM pairs p
    LEFT JOIN tokens t0 ON p.token0_address = t0.address
    LEFT JOIN tokens t1 ON p.token1_address = t1.address
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  return await db.queryMany(query, [limit, offset]);
}

// 获取交易对总数
async function getPairsCount() {
  const query = 'SELECT COUNT(*) as count FROM pairs';
  const result = await db.queryOne(query);
  return parseInt(result.count);
}

// 检查交易对是否存在
async function pairExists(address) {
  const query = 'SELECT EXISTS(SELECT 1 FROM pairs WHERE address = $1) as exists';
  const result = await db.queryOne(query, [address]);
  return result.exists;
}

module.exports = {
  createPair,
  updatePairReserves,
  getPairByAddress,
  getRecentPairs,
  getPairsCount,
  pairExists,
};

