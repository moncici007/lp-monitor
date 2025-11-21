-- LP Monitor Database Schema

-- 池子信息表
CREATE TABLE IF NOT EXISTS pools (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(20) NOT NULL,                    -- 'bsc' or 'solana'
  dex VARCHAR(50) NOT NULL,                      -- 'pancakeswap', 'raydium', 'orca', etc.
  pool_address VARCHAR(100) UNIQUE NOT NULL,
  token0_address VARCHAR(100),
  token0_symbol VARCHAR(20),
  token0_decimals INTEGER DEFAULT 18,
  token1_address VARCHAR(100),
  token1_symbol VARCHAR(20),
  token1_decimals INTEGER DEFAULT 18,
  reserve0 DECIMAL(38, 18),
  reserve1 DECIMAL(38, 18),
  liquidity DECIMAL(38, 18),
  fee_tier DECIMAL(5, 4) DEFAULT 0.0025,        -- 0.25% for most DEXs
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  tx_hash VARCHAR(100) NOT NULL,
  block_number BIGINT NOT NULL,
  event_type VARCHAR(20) NOT NULL,               -- 'swap', 'mint', 'burn'
  amount0_in DECIMAL(38, 18) DEFAULT 0,
  amount1_in DECIMAL(38, 18) DEFAULT 0,
  amount0_out DECIMAL(38, 18) DEFAULT 0,
  amount1_out DECIMAL(38, 18) DEFAULT 0,
  sender VARCHAR(100),
  recipient VARCHAR(100),
  usd_value DECIMAL(18, 2),                      -- 交易的美元价值
  price DECIMAL(38, 18),                         -- 执行价格
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tx_hash, pool_id)
);

-- 每小时聚合数据表
CREATE TABLE IF NOT EXISTS hourly_stats (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  hour_timestamp TIMESTAMP NOT NULL,
  volume_token0 DECIMAL(38, 18) DEFAULT 0,
  volume_token1 DECIMAL(38, 18) DEFAULT 0,
  volume_usd DECIMAL(18, 2) DEFAULT 0,
  tx_count INTEGER DEFAULT 0,
  swap_count INTEGER DEFAULT 0,
  add_liquidity_count INTEGER DEFAULT 0,
  remove_liquidity_count INTEGER DEFAULT 0,
  price_open DECIMAL(38, 18),
  price_close DECIMAL(38, 18),
  price_high DECIMAL(38, 18),
  price_low DECIMAL(38, 18),
  liquidity_start DECIMAL(38, 18),
  liquidity_end DECIMAL(38, 18),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pool_id, hour_timestamp)
);

-- 大额交易预警表
CREATE TABLE IF NOT EXISTS large_trade_alerts (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,               -- 'large_swap', 'large_liquidity_add', 'large_liquidity_remove'
  usd_value DECIMAL(18, 2),
  threshold_usd DECIMAL(18, 2),
  is_read BOOLEAN DEFAULT FALSE,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 系统状态表（用于跟踪监控状态）
CREATE TABLE IF NOT EXISTS monitor_status (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(20) UNIQUE NOT NULL,
  last_block_number BIGINT,
  last_sync_time TIMESTAMP,
  is_running BOOLEAN DEFAULT FALSE,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_pools_chain ON pools(chain);
CREATE INDEX IF NOT EXISTS idx_pools_address ON pools(pool_address);
CREATE INDEX IF NOT EXISTS idx_pools_active ON pools(is_active);

CREATE INDEX IF NOT EXISTS idx_transactions_pool_id ON transactions(pool_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_event_type ON transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_transactions_usd_value ON transactions(usd_value DESC);

CREATE INDEX IF NOT EXISTS idx_hourly_stats_pool_timestamp ON hourly_stats(pool_id, hour_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_timestamp ON hourly_stats(hour_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_pool_id ON large_trade_alerts(pool_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON large_trade_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON large_trade_alerts(created_at DESC);

-- 创建更新时间自动更新的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitor_status_updated_at BEFORE UPDATE ON monitor_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始监控状态
INSERT INTO monitor_status (chain, is_running) 
VALUES ('bsc', FALSE), ('solana', FALSE)
ON CONFLICT (chain) DO NOTHING;

