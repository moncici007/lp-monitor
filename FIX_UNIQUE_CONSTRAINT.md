# 🔧 修复数据库唯一约束错误

## 📅 创建时间
2024年11月24日

---

## ❌ 错误信息

```
there is no unique or exclusion constraint matching the ON CONFLICT specification
Error code: 42P10
```

---

## 🔍 问题分析

### 根本原因

**代码中使用了 `ON CONFLICT`，但数据库表缺少对应的 UNIQUE 约束！**

### 详细说明

#### 1. `transactions` 表

**代码**（`transactionRepository.js`）：
```javascript
ON CONFLICT (transaction_hash) DO NOTHING
```

**数据库**（`schema.sql`）：
```sql
CREATE TABLE transactions (
    transaction_hash VARCHAR(66) NOT NULL,  -- ❌ 没有 UNIQUE 约束
    ...
);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);  -- 只是普通索引
```

❌ **问题**: `ON CONFLICT` 需要 UNIQUE 约束，但只有普通索引！

#### 2. `liquidity_events` 表

**代码**（`liquidityRepository.js`）：
```javascript
ON CONFLICT (transaction_hash, event_type) DO NOTHING
```

**数据库**（`schema.sql`）：
```sql
CREATE TABLE liquidity_events (
    transaction_hash VARCHAR(66) NOT NULL,  -- ❌ 没有 UNIQUE 约束
    event_type VARCHAR(10) NOT NULL,        -- ❌ 没有 UNIQUE 约束
    ...
);
-- ❌ 没有组合 UNIQUE 约束
```

---

## 💡 解决方案

### 为什么使用 `(transaction_hash, log_index)`？

同一个交易（`transaction_hash`）可能包含**多个事件**：
- 例如通过路由器的多跳 Swap
- 例如一次性添加多个池子的流动性

所以应该使用 `(transaction_hash, log_index)` 作为唯一标识！

### 修复步骤

#### 第 1 步：执行数据库迁移

```bash
psql --host 127.0.0.1 --username postgres --dbname lp_monitor < fix-unique-constraints.sql
```

或

```bash
psql -U postgres -d lp_monitor -f fix-unique-constraints.sql
```

#### 第 2 步：验证约束

```bash
psql -U postgres -d lp_monitor -c "
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname IN (
    'unique_transaction_hash_log_index',
    'unique_liquidity_event_hash_log_index'
);
"
```

期望输出：
```
           constraint_name            | constraint_type |                        definition                         
--------------------------------------+-----------------+-----------------------------------------------------------
 unique_transaction_hash_log_index    | u               | UNIQUE (transaction_hash, log_index)
 unique_liquidity_event_hash_log_index| u               | UNIQUE (transaction_hash, log_index)
```

---

## 📁 修改的文件

### 1. 数据库迁移脚本

**文件**: `fix-unique-constraints.sql`

**内容**:
- 为 `transactions` 表添加 `log_index` 列
- 为 `liquidity_events` 表添加 `log_index` 列
- 添加 UNIQUE 约束 `(transaction_hash, log_index)`
- 更新索引

### 2. Repository 文件

#### `src/db/repositories/transactionRepository.js`

**修改前**:
```javascript
INSERT INTO transactions (...)
VALUES (...)
ON CONFLICT (transaction_hash) DO NOTHING  -- ❌ 错误
```

**修改后**:
```javascript
INSERT INTO transactions (..., log_index)  -- ✅ 添加 log_index
VALUES (..., $15)
ON CONFLICT (transaction_hash, log_index) DO NOTHING  -- ✅ 正确
```

#### `src/db/repositories/liquidityRepository.js`

**修改前**:
```javascript
INSERT INTO liquidity_events (...)
VALUES (...)
ON CONFLICT (transaction_hash, event_type) DO NOTHING  -- ❌ 错误
```

**修改后**:
```javascript
INSERT INTO liquidity_events (..., log_index)  -- ✅ 添加 log_index
VALUES (..., $12)
ON CONFLICT (transaction_hash, log_index) DO NOTHING  -- ✅ 正确
```

### 3. Event Processor

#### `src/monitor/streams/eventProcessor.js`

**修改**: 在三个事件处理函数中添加 `logIndex` 参数

**Swap 事件**:
```javascript
const txData = {
  // ... 其他字段
  logIndex: parseInt(log.logIndex || log.index || '0', 16), // ✅ 新增
};
```

**Mint 事件**:
```javascript
const eventData = {
  // ... 其他字段
  logIndex: parseInt(log.logIndex || log.index || '0', 16), // ✅ 新增
};
```

**Burn 事件**:
```javascript
const eventData = {
  // ... 其他字段
  logIndex: parseInt(log.logIndex || log.index || '0', 16), // ✅ 新增
};
```

---

## 🔍 `logIndex` 解析逻辑

```javascript
parseInt(log.logIndex || log.index || '0', 16)
```

**解释**:
- `log.logIndex`: QuickNode Streams 过滤器格式（已处理）
- `log.index`: 原始 log 格式（未处理）
- `'0'`: 如果都不存在，默认为 0
- `16`: 从十六进制字符串（如 `'0x1b0'`）转换为十进制数字

---

## ✅ 验证修复

### 1. 启动服务器

```bash
npm run webhook:raw
```

### 2. 发送测试数据

使用之前失败的数据再次测试（应该成功）。

### 3. 检查数据库

```bash
psql -U postgres -d lp_monitor -c "
SELECT 
    transaction_hash, 
    log_index, 
    block_number, 
    pair_address 
FROM transactions 
ORDER BY id DESC 
LIMIT 5;
"
```

应该能看到插入的数据，并且 `log_index` 字段有值。

---

## 📊 数据库结构变化

### transactions 表

**修改前**:
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    ...
);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
```

**修改后**:
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER,  -- ✅ 新增
    ...
    CONSTRAINT unique_transaction_hash_log_index UNIQUE (transaction_hash, log_index)  -- ✅ 新增
);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_log_index ON transactions(log_index);  -- ✅ 新增
```

### liquidity_events 表

**修改前**:
```sql
CREATE TABLE liquidity_events (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    event_type VARCHAR(10) NOT NULL,
    ...
);
```

**修改后**:
```sql
CREATE TABLE liquidity_events (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    event_type VARCHAR(10) NOT NULL,
    log_index INTEGER,  -- ✅ 新增
    ...
    CONSTRAINT unique_liquidity_event_hash_log_index UNIQUE (transaction_hash, log_index)  -- ✅ 新增
);
CREATE INDEX idx_liquidity_events_hash ON liquidity_events(transaction_hash);  -- ✅ 新增
CREATE INDEX idx_liquidity_events_log_index ON liquidity_events(log_index);  -- ✅ 新增
```

---

## 🎯 为什么这样修复？

### PostgreSQL `ON CONFLICT` 要求

`ON CONFLICT` 子句必须指定一个**推断目标**（inference target），该目标必须是：
1. 一个 UNIQUE 约束
2. 一个 UNIQUE 索引
3. 一个排他约束（EXCLUSION constraint）

**普通索引不符合要求！**

### 正确的做法

```sql
-- ✅ 方式 1: 显式约束
ALTER TABLE transactions 
ADD CONSTRAINT unique_transaction_hash_log_index 
UNIQUE (transaction_hash, log_index);

-- ✅ 方式 2: 唯一索引（隐式约束）
CREATE UNIQUE INDEX idx_transactions_unique 
ON transactions(transaction_hash, log_index);
```

---

## 📝 完整的修复命令

```bash
# 1. 执行数据库迁移
psql -U postgres -d lp_monitor -f fix-unique-constraints.sql

# 2. 验证约束
psql -U postgres -d lp_monitor -c "
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
  AND contype = 'u';
"

# 3. 重启服务器
npm run webhook:raw

# 4. 测试（应该不再报错）
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "Batch-Start-Range: 69325042" \
  -d @test-webhook-data.json
```

---

## 🎊 总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `ON CONFLICT` 错误 | 缺少 UNIQUE 约束 | 添加 `UNIQUE (transaction_hash, log_index)` |
| 重复事件 | 同一交易多个事件 | 使用 `log_index` 区分 |
| 数据丢失 | 约束冲突导致插入失败 | `DO NOTHING` 安全忽略重复 |

**现在系统可以正确处理同一交易中的多个事件了！** ✅

