# 🔧 过滤器逻辑修复

## 📅 修复时间
2024年11月24日

---

## ❌ 问题描述

`quicknode-stream-filter-with-factory.js` 缺少监控指定交易对池子的逻辑。

### 之前的错误代码

```javascript
// ❌ 错误：不管什么地址都会添加
if (topic0 === EVENT_SIGNATURES.SWAP) {
  eventType = "swap";
  stats.eventTypes.swap++;
}
// ... 其他事件
```

**问题**:
- 只要事件签名匹配，就会包含该事件
- 没有检查 Pair 地址是否在监控列表中
- 会返回所有 Pair 的所有事件，数据量巨大

---

## ✅ 修复方案

### 新增配置

```javascript
// 要监控的交易对地址列表
const MONITORED_PAIRS = [
  "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
  "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
];

// 是否监控所有交易对
const MONITOR_ALL_PAIRS = false;
```

---

### 修复后的逻辑

```javascript
// 将监控地址转换为 Set 以提高查找效率
const monitoredPairsSet = new Set(
  MONITORED_PAIRS.map(addr => addr.toLowerCase())
);

for (const log of logs) {
  const topic0 = log.topics[0];
  const logAddress = log.address.toLowerCase();
  
  let eventType = null;
  let shouldInclude = false;
  
  // 1. 检查是否是 Factory 的 PairCreated 事件
  if (topic0 === EVENT_SIGNATURES.PAIR_CREATED && logAddress === FACTORY_ADDRESS) {
    eventType = "pairCreated";
    shouldInclude = true;  // ✅ Factory 事件始终包含
  } 
  // 2. 检查是否是 Pair 事件
  else {
    // 首先检查地址是否在监控列表中
    const isPairMonitored = MONITOR_ALL_PAIRS || monitoredPairsSet.has(logAddress);
    
    if (isPairMonitored) {
      // 再检查事件类型
      if (topic0 === EVENT_SIGNATURES.SWAP) {
        eventType = "swap";
        shouldInclude = true;  // ✅ 只有监控的 Pair 才包含
      }
      // ... 其他事件类型
    }
  }
  
  // 只有 shouldInclude = true 时才添加
  if (eventType && shouldInclude) {
    events.push({...});
  }
}
```

---

## 📊 两种使用模式

### 模式 1：监控指定交易对（推荐）

```javascript
const MONITORED_PAIRS = [
  "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
  "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
];
const MONITOR_ALL_PAIRS = false;
```

**结果**:
- ✅ **Factory PairCreated**: 监听所有新创建的 Pair
- ✅ **Pair 事件**: 只监听上述 2 个地址的 Swap/Mint/Burn/Sync

**优势**:
- 数据量可控
- 性能更好
- 更精准的监控

---

### 模式 2：监控所有交易对（不推荐）

```javascript
const MONITORED_PAIRS = [];  // 可以为空
const MONITOR_ALL_PAIRS = true;
```

**结果**:
- ✅ **Factory PairCreated**: 监听所有新创建的 Pair
- ✅ **Pair 事件**: 监听**所有** Pair 的 Swap/Mint/Burn/Sync

**缺点**:
- ⚠️ 数据量巨大（BSC 上有数万个交易对）
- ⚠️ 性能压力大
- ⚠️ 存储压力大
- ⚠️ 可能超出 QuickNode Streams 的推送限制

---

## 🔄 动态更新流程

### 自动添加新 Pair 到监控列表

```
1. QuickNode 推送 PairCreated 事件
   ↓
2. eventProcessor.handlePairCreatedEvent()
   - 解析 token0, token1, pairAddress
   - 保存到数据库
   ↓
3. streamManager.updateStreamAddresses()
   - 获取所有 Pair 地址
   - 调用 QuickNode API 更新 Stream
   ↓
4. QuickNode 自动更新监听地址列表
   ↓
5. 开始接收新 Pair 的 Swap/Mint/Burn/Sync 事件
```

**关键点**:
- `MONITORED_PAIRS` 数组可以保持为空
- Stream 的地址列表由后端代码动态更新
- 不需要手动在过滤器中添加地址

---

## 🎯 过滤逻辑流程图

```
收到 Log
  ↓
是 Factory 的 PairCreated？
  ├── 是 → ✅ 包含（无需检查地址）
  └── 否 → 继续
        ↓
是 Pair 的 Swap/Mint/Burn/Sync？
  ├── 是 → 继续
  │       ↓
  │     MONITOR_ALL_PAIRS = true？
  │       ├── 是 → ✅ 包含（监控所有）
  │       └── 否 → 继续
  │               ↓
  │             地址在 MONITORED_PAIRS 中？
  │               ├── 是 → ✅ 包含
  │               └── 否 → ❌ 跳过
  └── 否 → ❌ 跳过（不是目标事件）
```

---

## 📈 性能优化

### 使用 Set 替代 Array

**之前（慢）**:
```javascript
const isPairMonitored = MONITORED_PAIRS.includes(logAddress);
// O(n) 时间复杂度
```

**现在（快）**:
```javascript
const monitoredPairsSet = new Set(
  MONITORED_PAIRS.map(addr => addr.toLowerCase())
);
const isPairMonitored = monitoredPairsSet.has(logAddress);
// O(1) 时间复杂度
```

**性能对比**:
- 100 个监控地址，1000 个日志
- Array: 100,000 次比较
- Set: 1,000 次查找
- **性能提升 100 倍！**

---

## 📊 返回数据结构变化

### 之前

```json
{
  "config": {
    "factoryAddress": "0xca143ce...",
    "monitoringFactory": true
  },
  "events": [...],
  "stats": {...}
}
```

### 现在

```json
{
  "config": {
    "factoryAddress": "0xca143ce...",
    "monitoringFactory": true,
    "monitoredPairsCount": 2,        // ← 新增
    "monitoringAll": false            // ← 新增
  },
  "events": [...],
  "stats": {...}
}
```

**新增字段说明**:
- `monitoredPairsCount`: 监控的交易对数量
- `monitoringAll`: 是否监控所有交易对

---

## 🧪 测试案例

### 测试 1: Factory PairCreated（应该通过）

```javascript
const log = {
  address: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",  // Factory 地址
  topics: [
    "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9",  // PairCreated
    "0x...",  // token0
    "0x...",  // token1
  ],
  data: "0x..."
};

// 结果：✅ 应该被包含
```

---

### 测试 2: 监控列表中的 Pair Swap（应该通过）

```javascript
const MONITORED_PAIRS = ["0x58f876857a02d6762e0101bb5c46a8c1ed44dc16"];

const log = {
  address: "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",  // 在监控列表中
  topics: [
    "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",  // Swap
    "0x...",  // sender
    "0x...",  // to
  ],
  data: "0x..."
};

// 结果：✅ 应该被包含
```

---

### 测试 3: 不在监控列表中的 Pair Swap（应该跳过）

```javascript
const MONITORED_PAIRS = ["0x58f876857a02d6762e0101bb5c46a8c1ed44dc16"];
const MONITOR_ALL_PAIRS = false;

const log = {
  address: "0x1111111111111111111111111111111111111111",  // 不在监控列表中
  topics: [
    "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",  // Swap
    "0x...",
    "0x...",
  ],
  data: "0x..."
};

// 结果：❌ 应该被跳过
```

---

### 测试 4: MONITOR_ALL_PAIRS = true（应该通过）

```javascript
const MONITORED_PAIRS = [];  // 空列表
const MONITOR_ALL_PAIRS = true;

const log = {
  address: "0x1111111111111111111111111111111111111111",  // 任意地址
  topics: [
    "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",  // Swap
    "0x...",
    "0x...",
  ],
  data: "0x..."
};

// 结果：✅ 应该被包含（因为 MONITOR_ALL_PAIRS = true）
```

---

## 🎯 最佳实践

### ✅ 推荐做法

```javascript
// 1. 初始设置为空，让系统自动添加
const MONITORED_PAIRS = [];
const MONITOR_ALL_PAIRS = false;

// 2. 后端代码会通过 API 动态更新地址列表
// streamManager.updateStreamAddresses([
//   "0x58f876857a...",
//   "0x8665a78ccc...",
//   ...
// ]);

// 3. QuickNode 会自动更新过滤器
```

---

### ❌ 不推荐做法

```javascript
// ❌ 不要手动维护一个很长的地址列表
const MONITORED_PAIRS = [
  "0x...",  // 100+ 个地址
  "0x...",
  // ...
];

// ❌ 不要开启监控所有（除非真的需要）
const MONITOR_ALL_PAIRS = true;  // 数据量太大
```

---

## 📝 代码审查清单

使用此过滤器时，确保：

- [ ] `FACTORY_ADDRESS` 正确（PancakeSwap V2 Factory）
- [ ] 事件签名正确（V2 vs V3）
- [ ] `MONITOR_ALL_PAIRS` 设置为 `false`（除非真的需要）
- [ ] 理解 `MONITORED_PAIRS` 会被后端动态更新
- [ ] 过滤器逻辑先检查 Factory，再检查 Pair
- [ ] 使用 Set 而不是 Array 进行地址查找

---

## 🎉 总结

### 修复内容

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 地址过滤 | ❌ 无过滤 | ✅ 基于 MONITORED_PAIRS |
| Factory 事件 | ✅ 正常 | ✅ 始终包含 |
| Pair 事件 | ❌ 包含所有 | ✅ 只包含监控的 |
| 性能 | ⚠️ O(n) | ✅ O(1) |
| 灵活性 | ❌ 无选项 | ✅ 可配置 |

### 关键改进

1. ✅ **添加地址过滤** - 只监控指定的 Pair
2. ✅ **性能优化** - 使用 Set 提高查找速度
3. ✅ **灵活配置** - 支持监控指定 Pair 或所有 Pair
4. ✅ **清晰逻辑** - Factory 事件和 Pair 事件分开处理
5. ✅ **可扩展** - 易于添加新的事件类型

---

**现在过滤器逻辑完整且高效了！** ✅

