# 🔧 修复 Underflow 错误

## 📅 修复时间
2024年11月24日

---

## ❌ 原始错误

```
❌ 处理 Swap 事件失败: underflow (argument="value", value=NaN, code=INVALID_ARGUMENT, version=6.15.0)
```

---

## 🔍 问题分析

### 错误原因

事件处理器在解析区块号和时间戳时，使用了简单的 `parseInt(blockNumber, 16)`，但没有考虑以下情况：

1. **数据格式多样性**
   - 十六进制字符串: `"0x1a2b3c"`
   - 数字: `123456`
   - 字符串数字: `"123456"`
   - 混合格式

2. **缺失或无效数据**
   - `undefined`
   - `null`
   - 空字符串
   - 无效的十六进制值

3. **结果**
   - `parseInt()` 返回 `NaN`
   - `NaN * 1000` 仍然是 `NaN`
   - `new Date(NaN)` 创建无效日期
   - 数据库操作失败，抛出 underflow 错误

---

## ✅ 解决方案

### 1. 添加健壮的数据解析

#### 修复前

```javascript
const timestamp = blockTimestamp 
  ? new Date(parseInt(blockTimestamp, 16) * 1000)
  : await getBlockTimestamp(parseInt(blockNumber, 16));

const txData = {
  blockNumber: parseInt(blockNumber, 16),
  // ...
};
```

#### 修复后

```javascript
// 安全地解析区块号
const blockNum = typeof blockNumber === 'string' && blockNumber.startsWith('0x')
  ? parseInt(blockNumber, 16)
  : typeof blockNumber === 'number'
    ? blockNumber
    : parseInt(blockNumber);

if (isNaN(blockNum)) {
  console.error('❌ 无效的区块号:', blockNumber);
  return;
}

// 转换时间戳
let timestamp;
if (blockTimestamp) {
  const timestampNum = typeof blockTimestamp === 'string' && blockTimestamp.startsWith('0x')
    ? parseInt(blockTimestamp, 16)
    : typeof blockTimestamp === 'number'
      ? blockTimestamp
      : parseInt(blockTimestamp);
  
  if (!isNaN(timestampNum)) {
    timestamp = new Date(timestampNum * 1000);
  }
}

// 如果没有有效的时间戳，从链上获取
if (!timestamp || isNaN(timestamp.getTime())) {
  timestamp = await getBlockTimestamp(blockNum);
}

const txData = {
  blockNumber: blockNum,  // 使用已验证的值
  // ...
};
```

### 2. 添加数据验证

在每个事件处理函数开头添加验证：

```javascript
// 验证必要字段
if (!blockNumber || !transactionHash || !topics || topics.length < 3) {
  console.error('❌ Swap 事件数据不完整:', { 
    blockNumber, 
    transactionHash, 
    topicsLength: topics?.length 
  });
  return;
}
```

### 3. 增强错误日志

```javascript
catch (error) {
  if (!error.message.includes('duplicate key')) {
    console.error('❌ 处理 Swap 事件失败:', error.message);
    console.error('   事件数据:', { 
      address: log.address, 
      blockNumber: log.blockNumber, 
      txHash: log.transactionHash 
    });
  }
}
```

---

## 🔧 修复的文件

### src/monitor/streams/eventProcessor.js

修复了以下函数：

1. ✅ `handleSwapEvent` - Swap 事件处理
2. ✅ `handleMintEvent` - Mint 事件处理
3. ✅ `handleBurnEvent` - Burn 事件处理
4. ✅ `handleSyncEvent` - Sync 事件处理

---

## 📊 支持的数据格式

### 区块号 (blockNumber)

| 格式 | 示例 | 支持 |
|------|------|------|
| 十六进制字符串 | `"0x1a2b3c"` | ✅ |
| 数字 | `123456` | ✅ |
| 字符串数字 | `"123456"` | ✅ |
| 混合 | - | ✅ |

### 时间戳 (blockTimestamp)

| 格式 | 示例 | 支持 |
|------|------|------|
| 十六进制字符串 | `"0x65a1b2c3"` | ✅ |
| 数字 (Unix秒) | `1705123456` | ✅ |
| 字符串数字 | `"1705123456"` | ✅ |
| 缺失/无效 | `undefined`, `null` | ✅ (回退到链上查询) |

---

## ✅ 验证测试

### 测试1: 解析逻辑

```bash
node test-event-parsing.js
```

结果: ✅ 所有格式都能正确解析

### 测试2: 边界情况

测试以下情况都能正确处理：
- ✅ `undefined` → 返回 NaN，被 `isNaN()` 捕获
- ✅ `null` → 返回 NaN，被 `isNaN()` 捕获
- ✅ 空字符串 → 返回 NaN，被 `isNaN()` 捕获
- ✅ 无效十六进制 → 返回 NaN，被 `isNaN()` 捕获

### 测试3: 实际 Webhook 数据

```bash
# 启动监控
npm run monitor:streams

# 等待接收 webhook 数据
```

期望输出：
```
📨 收到 Streams Webhook 数据
✅ 匹配格式2：对象格式（JavaScript 过滤器）
   处理 4 个预过滤事件...
💱 Swap: 0x8665a78c... | 0x7c5620a5...
💱 Swap: 0x8665a78c... | 0x7c5620a5...
✅ 处理完成，共 4 个事件
```

---

## 🎯 关键改进

### 1. 健壮性 ⬆️

- ✅ 支持多种数据格式
- ✅ 验证必要字段
- ✅ 检测无效值
- ✅ 优雅降级（回退到链上查询）

### 2. 调试性 ⬆️

- ✅ 详细的错误日志
- ✅ 记录失败的事件数据
- ✅ 区分不同类型的错误

### 3. 兼容性 ⬆️

- ✅ V2 和 V3 事件都支持
- ✅ QuickNode 不同格式的数据都兼容
- ✅ 向后兼容现有代码

---

## 📝 代码示例

### 完整的健壮解析函数

```javascript
function parseBlockNumber(blockNumber) {
  // 检查输入
  if (!blockNumber) return NaN;
  
  // 解析不同格式
  const blockNum = typeof blockNumber === 'string' && blockNumber.startsWith('0x')
    ? parseInt(blockNumber, 16)  // 十六进制
    : typeof blockNumber === 'number'
      ? blockNumber  // 数字
      : parseInt(blockNumber);  // 字符串数字
  
  return blockNum;
}

function parseTimestamp(blockTimestamp) {
  if (!blockTimestamp) return null;
  
  const timestampNum = typeof blockTimestamp === 'string' && blockTimestamp.startsWith('0x')
    ? parseInt(blockTimestamp, 16)
    : typeof blockTimestamp === 'number'
      ? blockTimestamp
      : parseInt(blockTimestamp);
  
  if (isNaN(timestampNum)) return null;
  
  return new Date(timestampNum * 1000);
}

// 使用示例
async function processEvent(log) {
  const blockNum = parseBlockNumber(log.blockNumber);
  
  if (isNaN(blockNum)) {
    console.error('无效的区块号');
    return;
  }
  
  const timestamp = parseTimestamp(log.blockTimestamp) ||
                    await getBlockTimestamp(blockNum);
  
  // 继续处理...
}
```

---

## 🚀 后续建议

### 立即行动

1. ✅ **已完成** - 修复事件处理器
2. ✅ **已完成** - 添加验证逻辑
3. 🔄 **测试** - 重启监控系统验证修复

### 可选优化

1. **添加单元测试**
   - 为解析函数添加单元测试
   - 覆盖各种边界情况

2. **监控和告警**
   - 统计解析失败的次数
   - 如果失败率高，发送告警

3. **性能优化**
   - 缓存区块时间戳
   - 减少链上查询次数

---

## 📖 相关文档

- [WEBHOOK_DATA_FORMAT.md](./WEBHOOK_DATA_FORMAT.md) - Webhook 数据格式
- [EVENT_SIGNATURES.md](./EVENT_SIGNATURES.md) - 事件签名参考
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南

---

## ✅ 验证清单

- [x] Swap 事件解析修复
- [x] Mint 事件解析修复
- [x] Burn 事件解析修复
- [x] Sync 事件解析修复
- [x] 添加数据验证
- [x] 添加错误处理
- [x] 添加详细日志
- [x] 创建测试脚本
- [x] 更新文档

---

**修复完成！** 系统现在能够健壮地处理各种格式的区块号和时间戳。🎉

