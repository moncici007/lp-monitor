-- 创建数据库（如果需要手动创建）
-- CREATE DATABASE lp_monitor;

-- 代币表
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255),
    symbol VARCHAR(50),
    decimals INTEGER,
    total_supply DECIMAL(78, 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokens_address ON tokens(address);
CREATE INDEX idx_tokens_symbol ON tokens(symbol);

-- 交易对表
CREATE TABLE IF NOT EXISTS pairs (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    token0_id INTEGER REFERENCES tokens(id),
    token1_id INTEGER REFERENCES tokens(id),
    token0_address VARCHAR(42) NOT NULL,
    token1_address VARCHAR(42) NOT NULL,
    reserve0 DECIMAL(78, 0) DEFAULT 0,
    reserve1 DECIMAL(78, 0) DEFAULT 0,
    total_supply DECIMAL(78, 0) DEFAULT 0,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pairs_address ON pairs(address);
CREATE INDEX idx_pairs_token0 ON pairs(token0_address);
CREATE INDEX idx_pairs_token1 ON pairs(token1_address);
CREATE INDEX idx_pairs_created_at ON pairs(created_at);

-- 交易记录表（Swap事件）
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    pair_id INTEGER REFERENCES pairs(id),
    pair_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    sender VARCHAR(42) NOT NULL,
    recipient VARCHAR(42),
    amount0_in DECIMAL(78, 0) DEFAULT 0,
    amount1_in DECIMAL(78, 0) DEFAULT 0,
    amount0_out DECIMAL(78, 0) DEFAULT 0,
    amount1_out DECIMAL(78, 0) DEFAULT 0,
    amount_usd DECIMAL(18, 2),
    is_large BOOLEAN DEFAULT FALSE,
    gas_price DECIMAL(78, 0),
    gas_used BIGINT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_pair ON transactions(pair_id);
CREATE INDEX idx_transactions_pair_address ON transactions(pair_address);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_is_large ON transactions(is_large);
CREATE INDEX idx_transactions_block ON transactions(block_number);

-- 流动性事件表（Mint/Burn）
CREATE TABLE IF NOT EXISTS liquidity_events (
    id SERIAL PRIMARY KEY,
    pair_id INTEGER REFERENCES pairs(id),
    pair_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    event_type VARCHAR(10) NOT NULL, -- 'mint' 或 'burn'
    sender VARCHAR(42) NOT NULL,
    recipient VARCHAR(42),
    amount0 DECIMAL(78, 0) NOT NULL,
    amount1 DECIMAL(78, 0) NOT NULL,
    liquidity DECIMAL(78, 0),
    amount_usd DECIMAL(18, 2),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_liquidity_events_pair ON liquidity_events(pair_id);
CREATE INDEX idx_liquidity_events_pair_address ON liquidity_events(pair_address);
CREATE INDEX idx_liquidity_events_type ON liquidity_events(event_type);
CREATE INDEX idx_liquidity_events_timestamp ON liquidity_events(timestamp);
CREATE INDEX idx_liquidity_events_block ON liquidity_events(block_number);

-- 同步事件表（价格更新）
CREATE TABLE IF NOT EXISTS sync_events (
    id SERIAL PRIMARY KEY,
    pair_id INTEGER REFERENCES pairs(id),
    pair_address VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    reserve0 DECIMAL(78, 0) NOT NULL,
    reserve1 DECIMAL(78, 0) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_events_pair ON sync_events(pair_id);
CREATE INDEX idx_sync_events_timestamp ON sync_events(timestamp);

-- 分析数据表（小时级别统计）
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    pair_id INTEGER REFERENCES pairs(id),
    pair_address VARCHAR(42) NOT NULL,
    hour_timestamp TIMESTAMP NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    volume_token0 DECIMAL(78, 0) DEFAULT 0,
    volume_token1 DECIMAL(78, 0) DEFAULT 0,
    volume_usd DECIMAL(18, 2) DEFAULT 0,
    large_transactions_count INTEGER DEFAULT 0,
    liquidity_add_count INTEGER DEFAULT 0,
    liquidity_remove_count INTEGER DEFAULT 0,
    net_liquidity_token0 DECIMAL(78, 0) DEFAULT 0,
    net_liquidity_token1 DECIMAL(78, 0) DEFAULT 0,
    price_high DECIMAL(36, 18),
    price_low DECIMAL(36, 18),
    price_open DECIMAL(36, 18),
    price_close DECIMAL(36, 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pair_address, hour_timestamp)
);

CREATE INDEX idx_analytics_pair ON analytics(pair_id);
CREATE INDEX idx_analytics_hour ON analytics(hour_timestamp);

-- 套利信号/警报表
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    pair_id INTEGER REFERENCES pairs(id),
    pair_address VARCHAR(42) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'large_buy', 'large_sell', 'liquidity_surge', 'liquidity_drain', 'price_spike'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_pair ON alerts(pair_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);

-- 监控状态表（记录监听器状态）
CREATE TABLE IF NOT EXISTS monitor_state (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    last_block_number BIGINT,
    last_sync_time TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为各表添加更新时间戳触发器
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pairs_updated_at BEFORE UPDATE ON pairs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitor_state_updated_at BEFORE UPDATE ON monitor_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

