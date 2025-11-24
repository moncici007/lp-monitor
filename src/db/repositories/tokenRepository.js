const db = require('../client');

// 创建或更新代币信息
async function upsertToken(tokenData) {
  const { address, name, symbol, decimals, totalSupply } = tokenData;
  
  const query = `
    INSERT INTO tokens (address, name, symbol, decimals, total_supply)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (address) 
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, tokens.name),
      symbol = COALESCE(EXCLUDED.symbol, tokens.symbol),
      decimals = COALESCE(EXCLUDED.decimals, tokens.decimals),
      total_supply = COALESCE(EXCLUDED.total_supply, tokens.total_supply),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return await db.queryOne(query, [address, name, symbol, decimals, totalSupply]);
}

// 根据地址获取代币
async function getTokenByAddress(address) {
  const query = 'SELECT * FROM tokens WHERE address = $1';
  return await db.queryOne(query, [address]);
}

// 批量获取代币
async function getTokensByAddresses(addresses) {
  const query = 'SELECT * FROM tokens WHERE address = ANY($1)';
  return await db.queryMany(query, [addresses]);
}

module.exports = {
  upsertToken,
  getTokenByAddress,
  getTokensByAddresses,
};

