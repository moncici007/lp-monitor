# 🔧 修复缺少区块信息问题

## 📅 修复时间
2024年11月24日

---

## ❌ 问题描述

从抓包数据发现，QuickNode 发送的 webhook 数据中**缺少 `blockNumber` 和 `blockTimestamp` 字段**：

### 实际接收到的数据

```json
{
  "events": [
    {
      "address": "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
      "data": "0x...",
      "eventType": "sync",
      "from": "0xdd3f7fb41e39219580852804615f893ed087f6cc",
      "gasUsed": "0x1bf0e",
      "logIndex": "0xeb",
      "topics": [...],
      "transactionHash": "0x432ac5bc...",
      "transactionIndex": "0x39"
      // ❌ 缺少: blockNumber
      // ❌ 缺少: blockTimestamp
    }
  ]
}
```

### HTTP Headers 中有区块信息

```
Batch-Start-Range: 69325042
Batch-End-Range: 69325042
Stream-Start-Range: 69325042
Stream-End-Range: 69325042
```

---

## 🔍 根本原因

两种可能性：

### 1. QuickNode 过滤器配置问题

用户在 QuickNode Dashboard 中配置的 JavaScript 过滤器可能：
- 没有添加 `blockNumber` 和 `blockTimestamp` 字段
- 使用了简化的配置
- QuickNode 自动过滤掉了某些字段

### 2. QuickNode 的行为

QuickNode 可能为了减少数据传输量，自动移除了某些字段，但保留在 HTTP Headers 中。

---

## ✅ 解决方案

### 方案 1: 从 HTTP Headers 提取区块信息（已实施）

修改 `webhookServer.js`，在处理事件前从 Headers 中提取区块号：

```javascript
// 从 headers 中提取区块信息
const blockNumber = req.headers['batch-start-range'] || req.headers['stream-start-range'];
const blockTimestamp = null; // Headers 中没有时间戳

// 检查事件是否缺少区块信息
const needsBlockInfo = payload.events.length > 0 && !payload.events[0].blockNumber;

if (needsBlockInfo && blockNumber) {
  console.log(`   ⚠️  事件缺少区块信息，从 Headers 补充: ${blockNumber}`);
  // 为每个事件添加区块信息
  payload.events.forEach(event => {
    event.blockNumber = blockNumber;
    event.blockTimestamp = blockTimestamp;
  });
}
```

**优点**:
- ✅ 快速修复，无需重新配置 QuickNode
- ✅ 向后兼容（如果有 blockNumber 就不覆盖）
- ✅ 利用现有的 Headers 数据

**缺点**:
- ⚠️  时间戳仍需从链上查询
- ⚠️  一个批次中所有事件共享同一个区块号（通常没问题）

---

### 方案 2: 更新 QuickNode 过滤器（可选）

在 QuickNode Dashboard 中更新 JavaScript 过滤器，确保包含完整的区块信息：

```javascript
events.push({
  // 区块信息 - 确保这些字段存在
  blockNumber: block.number,
  blockHash: block.hash,
  blockTimestamp: block.timestamp,
  
  // 交易信息
  transactionHash: receipt.transactionHash,
  transactionIndex: receipt.transactionIndex,
  from: receipt.from,
  to: receipt.to,
  gasUsed: receipt.gasUsed,
  effectiveGasPrice: receipt.effectiveGasPrice,
  
  // 日志信息
  logIndex: log.logIndex,
  address: log.address,
  
  // 事件数据
  eventType: eventType,
  topics: log.topics,
  data: log.data,
  
  // 元数据
  removed: log.removed || false
});
```

**优点**:
- ✅ 数据更完整
- ✅ 每个事件都有准确的区块信息
- ✅ 不依赖 Headers

**缺点**:
- ⚠️  需要重新配置 QuickNode
- ⚠️  可能增加数据传输量

---

## 🔧 已修复的文件

### src/monitor/streams/webhookServer.js

**变更 1: 提取 Headers 中的区块号**

```javascript
// 从 headers 中提取区块信息（如果事件中缺少）
const blockNumber = req.headers['batch-start-range'] || req.headers['stream-start-range'];
const blockTimestamp = null; // Headers 中没有时间戳，需要从链上查询
```

**变更 2: 自动补充缺失的区块信息**

```javascript
// 检查事件是否缺少区块信息
const needsBlockInfo = payload.events.length > 0 && !payload.events[0].blockNumber;

if (needsBlockInfo && blockNumber) {
  console.log(`   ⚠️  事件缺少区块信息，从 Headers 补充: ${blockNumber}`);
  // 为每个事件添加区块信息
  payload.events.forEach(event => {
    event.blockNumber = blockNumber;
    event.blockTimestamp = blockTimestamp;
  });
}
```

**变更 3: 注释掉大数据量日志**

```javascript
// console.log('   Payload 数据:', JSON.stringify(payload, null, 2)); // 数据太大，注释掉
```

---

## 📊 HTTP Headers 参考

QuickNode 发送的 Webhook 包含以下有用的 Headers：

| Header | 示例值 | 说明 |
|--------|--------|------|
| `Batch-Start-Range` | `69325042` | 批次起始区块号 |
| `Batch-End-Range` | `69325042` | 批次结束区块号 |
| `Stream-Start-Range` | `69325042` | Stream 起始区块号 |
| `Stream-End-Range` | `69325042` | Stream 结束区块号 |
| `Stream-Id` | `77c7177a...` | Stream 唯一标识符 |
| `Stream-Name` | `test-stream` | Stream 名称 |
| `Stream-Network` | `bnbchain-mainnet` | 网络名称 |
| `Stream-Dataset` | `block_with_receipts` | 数据集类型 |
| `X-Qn-Nonce` | `ffa0253d...` | QuickNode nonce |
| `X-Qn-Signature` | `6cd6ab85...` | 签名（用于验证） |
| `X-Qn-Timestamp` | `1763995639` | 时间戳 |

---

## ✅ 验证修复

### 测试步骤

1. **重启监控系统**
   ```bash
   npm run monitor:streams
   ```

2. **等待 Webhook 数据**
   应该看到：
   ```
   📨 收到 Streams Webhook 数据
   ✅ 匹配格式2：对象格式（JavaScript 过滤器）
   ⚠️  事件缺少区块信息，从 Headers 补充: 69325042
      处理 4 个预过滤事件...
   💱 Swap: 0x8665a78c... | 0x432ac5bc...
   ✅ 处理完成，共 4 个事件
   ```

3. **检查数据库**
   ```bash
   psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor
   
   SELECT block_number, transaction_hash, pair_address 
   FROM transactions 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   
   应该能看到正确的 `block_number`。

---

## 🎯 关键改进

### 1. 健壮性 ⬆️

- ✅ 自动检测缺失的区块信息
- ✅ 从 HTTP Headers 中提取
- ✅ 只在需要时补充（不覆盖现有值）

### 2. 兼容性 ⬆️

- ✅ 同时支持完整和不完整的数据
- ✅ 向后兼容
- ✅ 不影响现有功能

### 3. 可观测性 ⬆️

- ✅ 清晰的日志提示
- ✅ 显示从哪里获取的区块号
- ✅ 便于调试

---

## 📝 代码流程

```
1. 接收 Webhook 请求
   ↓
2. 提取 HTTP Headers
   - batch-start-range
   - stream-start-range
   ↓
3. 解析 Payload
   ↓
4. 检查第一个事件是否有 blockNumber
   ↓
5a. 如果有 → 直接处理
   ↓
5b. 如果没有 → 从 Headers 补充
   ↓
6. 为每个事件添加区块信息
   ↓
7. 调用 handleFilteredEvents() 处理
   ↓
8. 事件处理器使用健壮的解析逻辑
   - 支持十六进制、数字、字符串格式
   - 验证 NaN
   - 回退到链上查询时间戳
   ↓
9. 存储到数据库
```

---

## 🚀 后续建议

### 立即行动

1. ✅ **已完成** - 修改 webhookServer.js
2. 🔄 **测试** - 重启系统验证修复
3. 🔄 **监控** - 查看事件是否正确存储

### 可选优化

1. **添加签名验证**
   - 使用 `X-Qn-Signature` 验证请求来源
   - 防止伪造的 webhook 请求

2. **缓存区块时间戳**
   - 减少链上查询
   - 提高处理速度

3. **更新 QuickNode 过滤器**
   - 在 Dashboard 中更新过滤器代码
   - 包含完整的区块信息

---

## 📖 相关文档

- [WEBHOOK_DATA_FORMAT.md](./WEBHOOK_DATA_FORMAT.md) - Webhook 数据格式
- [FIX_UNDERFLOW_ERROR.md](./FIX_UNDERFLOW_ERROR.md) - Underflow 错误修复
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南

---

## ✅ 验证清单

- [x] 从 HTTP Headers 提取区块号
- [x] 自动检测缺失字段
- [x] 为事件补充区块信息
- [x] 注释掉大数据量日志
- [x] 保持向后兼容性
- [x] 添加详细日志
- [x] 创建文档

---

**修复完成！** 系统现在能够从 HTTP Headers 中提取区块信息，即使 QuickNode 没有在事件数据中包含这些字段。🎉

