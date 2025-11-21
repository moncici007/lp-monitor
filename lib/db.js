const { Pool } = require('pg');

// 创建数据库连接池
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('数据库连接池错误:', err);
    });
  }
  return pool;
}

// 执行查询
async function query(text, params) {
  const client = getPool();
  try {
    const start = Date.now();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('慢查询:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('查询错误:', error);
    throw error;
  }
}

// 执行事务
async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 获取或创建池子
async function getOrCreatePool(poolData) {
  const { chain, dex, pool_address, token0_address, token0_symbol, token0_decimals,
          token1_address, token1_symbol, token1_decimals } = poolData;
  
  // 先尝试查找
  const findQuery = 'SELECT * FROM pools WHERE pool_address = $1';
  const findResult = await query(findQuery, [pool_address]);
  
  if (findResult.rows.length > 0) {
    return findResult.rows[0];
  }
  
  // 不存在则创建
  const insertQuery = `
    INSERT INTO pools (
      chain, dex, pool_address, 
      token0_address, token0_symbol, token0_decimals,
      token1_address, token1_symbol, token1_decimals
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  
  const insertResult = await query(insertQuery, [
    chain, dex, pool_address,
    token0_address, token0_symbol, token0_decimals || 18,
    token1_address, token1_symbol, token1_decimals || 18
  ]);
  
  return insertResult.rows[0];
}

// 插入交易记录
async function insertTransaction(txData) {
  const {
    pool_id, tx_hash, block_number, event_type,
    amount0_in, amount1_in, amount0_out, amount1_out,
    sender, recipient, usd_value, price, timestamp
  } = txData;
  
  const insertQuery = `
    INSERT INTO transactions (
      pool_id, tx_hash, block_number, event_type,
      amount0_in, amount1_in, amount0_out, amount1_out,
      sender, recipient, usd_value, price, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (tx_hash, pool_id) DO NOTHING
    RETURNING *
  `;
  
  try {
    const result = await query(insertQuery, [
      pool_id, tx_hash, block_number, event_type,
      amount0_in || 0, amount1_in || 0, amount0_out || 0, amount1_out || 0,
      sender, recipient, usd_value, price, timestamp
    ]);
    return result.rows[0];
  } catch (error) {
    if (error.code !== '23505') { // 忽略重复键错误
      console.error('插入交易失败:', error);
    }
    return null;
  }
}

// 更新池子储备量
async function updatePoolReserves(pool_address, reserve0, reserve1, liquidity) {
  const updateQuery = `
    UPDATE pools 
    SET reserve0 = $1, reserve1 = $2, liquidity = $3, updated_at = NOW()
    WHERE pool_address = $4
    RETURNING *
  `;
  
  const result = await query(updateQuery, [reserve0, reserve1, liquidity, pool_address]);
  return result.rows[0];
}

// 更新或插入小时统计数据
async function upsertHourlyStats(statsData) {
  const {
    pool_id, hour_timestamp, volume_token0, volume_token1, volume_usd,
    tx_count, swap_count, add_liquidity_count, remove_liquidity_count,
    price_open, price_close, price_high, price_low,
    liquidity_start, liquidity_end
  } = statsData;
  
  const upsertQuery = `
    INSERT INTO hourly_stats (
      pool_id, hour_timestamp, volume_token0, volume_token1, volume_usd,
      tx_count, swap_count, add_liquidity_count, remove_liquidity_count,
      price_open, price_close, price_high, price_low,
      liquidity_start, liquidity_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (pool_id, hour_timestamp) 
    DO UPDATE SET
      volume_token0 = hourly_stats.volume_token0 + EXCLUDED.volume_token0,
      volume_token1 = hourly_stats.volume_token1 + EXCLUDED.volume_token1,
      volume_usd = hourly_stats.volume_usd + EXCLUDED.volume_usd,
      tx_count = hourly_stats.tx_count + EXCLUDED.tx_count,
      swap_count = hourly_stats.swap_count + EXCLUDED.swap_count,
      add_liquidity_count = hourly_stats.add_liquidity_count + EXCLUDED.add_liquidity_count,
      remove_liquidity_count = hourly_stats.remove_liquidity_count + EXCLUDED.remove_liquidity_count,
      price_close = EXCLUDED.price_close,
      price_high = GREATEST(hourly_stats.price_high, EXCLUDED.price_high),
      price_low = LEAST(hourly_stats.price_low, EXCLUDED.price_low),
      liquidity_end = EXCLUDED.liquidity_end
    RETURNING *
  `;
  
  const result = await query(upsertQuery, [
    pool_id, hour_timestamp, volume_token0 || 0, volume_token1 || 0, volume_usd || 0,
    tx_count || 0, swap_count || 0, add_liquidity_count || 0, remove_liquidity_count || 0,
    price_open, price_close, price_high, price_low,
    liquidity_start, liquidity_end
  ]);
  
  return result.rows[0];
}

// 创建大额交易预警
async function createAlert(alertData) {
  const { transaction_id, pool_id, alert_type, usd_value, threshold_usd } = alertData;
  
  const insertQuery = `
    INSERT INTO large_trade_alerts (
      transaction_id, pool_id, alert_type, usd_value, threshold_usd
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const result = await query(insertQuery, [
    transaction_id, pool_id, alert_type, usd_value, threshold_usd
  ]);
  
  return result.rows[0];
}

// 更新监控状态
async function updateMonitorStatus(chain, status) {
  const updateQuery = `
    INSERT INTO monitor_status (chain, is_running, last_sync_time)
    VALUES ($1, $2, NOW())
    ON CONFLICT (chain) 
    DO UPDATE SET 
      is_running = $2,
      last_sync_time = NOW(),
      updated_at = NOW()
  `;
  
  await query(updateQuery, [chain, status]);
}

// 关闭连接池
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  query,
  transaction,
  getOrCreatePool,
  insertTransaction,
  updatePoolReserves,
  upsertHourlyStats,
  createAlert,
  updateMonitorStatus,
  closePool
};

