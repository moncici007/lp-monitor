-- 修复数据库约束问题
-- 为 transactions 和 liquidity_events 表添加 log_index 和 UNIQUE 约束

-- 1. 为 transactions 表添加 log_index 列
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS log_index INTEGER;

-- 2. 为已存在的记录设置默认 log_index（如果为 NULL）
UPDATE transactions 
SET log_index = 0 
WHERE log_index IS NULL;

-- 3. 删除旧的索引
DROP INDEX IF EXISTS idx_transactions_hash;

-- 4. 添加 UNIQUE 约束（transaction_hash + log_index）
-- 先检查是否已存在该约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_transaction_hash_log_index'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT unique_transaction_hash_log_index 
        UNIQUE (transaction_hash, log_index);
    END IF;
END $$;

-- 5. 重新创建索引以支持查询性能
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_log_index ON transactions(log_index);

-- 6. 为 liquidity_events 表添加 log_index 列
ALTER TABLE liquidity_events 
ADD COLUMN IF NOT EXISTS log_index INTEGER;

-- 7. 为已存在的记录设置默认 log_index（如果为 NULL）
UPDATE liquidity_events 
SET log_index = 0 
WHERE log_index IS NULL;

-- 8. 添加 UNIQUE 约束（liquidity_events）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_liquidity_event_hash_log_index'
    ) THEN
        ALTER TABLE liquidity_events 
        ADD CONSTRAINT unique_liquidity_event_hash_log_index 
        UNIQUE (transaction_hash, log_index);
    END IF;
END $$;

-- 9. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_liquidity_events_hash ON liquidity_events(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_liquidity_events_log_index ON liquidity_events(log_index);

-- 10. 验证约束已添加
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname IN (
    'unique_transaction_hash_log_index',
    'unique_liquidity_event_hash_log_index'
);

ECHO "✅ 数据库约束修复完成！";

