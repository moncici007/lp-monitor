# 🏭 使用 QuickNode Streams 监听 PairCreated 事件

## 📅 创建时间
2024年11月24日

---

## 🎯 为什么使用 Streams 监听 PairCreated？

### ❌ 之前的方案（ethers.js 直接监听）

```javascript
// factoryListener.js
factoryContract.on('PairCreated', async (token0, token1, pairAddress, pairIndex, event) => {
  // 处理事件...
});
```

**问题**:
- ❌ 需要持续的 RPC 调用（`eth_newFilter` + `eth_getFilterChanges`）
- ❌ 占用 QuickNode 的 RPC 配额
- ❌ 可能触发速率限制
- ❌ 需要管理监听器的生命周期

---

### ✅ 新方案（QuickNode Streams）

**优势**:
- ✅ **无 RPC 调用** - QuickNode 主动推送数据
- ✅ **统一架构** - Swap/Mint/Burn/PairCreated 都通过 Streams
- ✅ **更可靠** - Streams 有重试机制和保证送达
- ✅ **更高效** - 批量推送，减少网络开销
- ✅ **简化代码** - 不需要维护多个监听器

---

## 🔧 实现原理

### 关键配置

QuickNode Stream 可以同时监听**多个地址**和**多个事件**：

```javascript
{
  filter_config: {
    type: 'logs',
    addresses: [
      '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',  // Factory 地址
      '0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5',  // Pair 1
      '0x...',                                         // Pair 2
      // ... 更多 Pairs
    ],
    topics: [
      '0x0d3648bd...', // PairCreated
      '0xd78ad95f...', // Swap
      '0x4c209b5f...', // Mint
      '0xdccd412f...', // Burn
      '0x1c411e9a...', // Sync
    ]
  }
}
```

**工作流程**:
1. QuickNode 监听 Factory 地址的 PairCreated 事件
2. 检测到新 Pair 后，推送到我们的 Webhook
3. `eventProcessor.js` 处理 PairCreated 事件
4. 保存新 Pair 到数据库
5. 调用 `streamManager.updateStreamAddresses()` 更新监听列表
6. QuickNode 开始监听新 Pair 的 Swap/Mint/Burn/Sync 事件

---

## 📝 已完成的修改

### 1. `streamManager.js`

**添加 PairCreated 事件签名**:
```javascript
const EVENT_TOPICS = [
  '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated ✅ 新增
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap V2
  '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // Mint V2
  // ... 其他事件
];
```

**自动包含 Factory 地址**:
```javascript
async function updateStreamAddresses(pairAddresses, includeFactory = true) {
  const FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
  
  // 始终包含 Factory 地址以监听 PairCreated 事件
  const allAddresses = includeFactory 
    ? [FACTORY_ADDRESS.toLowerCase(), ...pairAddresses]
    : pairAddresses;
    
  // 更新 Stream 配置...
}
```

---

### 2. `eventProcessor.js`

**添加 PairCreated 处理逻辑**:
```javascript
// 事件签名
const EVENT_SIGNATURES = {
  PAIR_CREATED: '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // ✅ 新增
  SWAP_V2: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  // ...
};

// 处理函数
async function handlePairCreatedEvent(log) {
  // 1. 解析 PairCreated 事件数据
  // 2. 提取 token0, token1, pairAddress
  // 3. 获取代币信息
  // 4. 保存到数据库
  // 5. 更新 Stream 配置（添加新 Pair 到监听列表）
}
```

**在 processLog 中分发**:
```javascript
switch (eventSignature) {
  case EVENT_SIGNATURES.PAIR_CREATED:  // ✅ 新增
    await handlePairCreatedEvent(log);
    break;
  case EVENT_SIGNATURES.SWAP_V2:
    await handleSwapEvent(log);
    break;
  // ...
}
```

---

### 3. QuickNode 过滤器脚本

**新文件**: `quicknode-stream-filter-with-factory.js`

**关键部分**:
```javascript
const EVENT_SIGNATURES = {
  PAIR_CREATED: "0x0d3648bd...",  // ✅ 新增
  SWAP: "0xd78ad95f...",
  MINT: "0x4c209b5f...",
  BURN: "0xdccd412f...",
  SYNC: "0x1c411e9a...",
};

// 匹配 PairCreated 事件
if (topic0 === EVENT_SIGNATURES.PAIR_CREATED && logAddress === FACTORY_ADDRESS) {
  eventType = "pairCreated";
  events.push({
    eventType: "pairCreated",
    address: log.address,
    // ...
  });
}
```

---

## 🚀 配置步骤

### 第 1 步：更新 QuickNode Stream 过滤器

1. 登录 QuickNode Dashboard
2. 找到您的 Stream
3. 点击 "Edit Filter"
4. 粘贴 `quicknode-stream-filter-with-factory.js` 的内容
5. 保存

---

### 第 2 步：更新 Stream 地址列表

Stream 会通过代码自动更新，但您也可以手动初始化：

```bash
# 使用配置脚本
node configure-stream.js
```

或者编写简单脚本：

```javascript
const streamManager = require('./src/monitor/streams/streamManager');
const pairRepository = require('./src/db/repositories/pairRepository');

async function initStream() {
  // 获取现有交易对
  const pairs = await pairRepository.getRecentPairs(200);
  const addresses = pairs.map(p => p.address.toLowerCase());
  
  // 更新 Stream（自动包含 Factory 地址）
  await streamManager.updateStreamAddresses(addresses, true);
  
  console.log('✅ Stream 配置完成！');
  console.log(`   Factory: 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`);
  console.log(`   Pairs: ${addresses.length}`);
}

initStream();
```

---

### 第 3 步：验证配置

**检查 Stream 配置**:
```bash
node verify-stream-config.js
```

**应该看到**:
```json
{
  "filter_config": {
    "type": "logs",
    "addresses": [
      "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",  // ← Factory 地址
      "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",  // ← Pair 1
      "0x..."                                          // ← More pairs
    ],
    "topics": [
      "0x0d3648bd...",  // ← PairCreated
      "0xd78ad95f...",  // ← Swap
      // ...
    ]
  }
}
```

---

### 第 4 步：启动监控

```bash
npm run monitor
```

**应该看到的日志**:

当检测到新 Pair 时：
```
📨 收到 Webhook 请求
   📦 收到数据块 #1: 1234 字节
   ✅ 数据接收完成
   ✅ JSON 解析成功
   📊 事件数量: 1
   处理 1 个预过滤事件...

🆕 检测到新交易对创建:
   Factory: 0xca143ce32fe78f1f7019d7d551a6402fc5350c73
   Pair: 0x1234567890abcdef...
   Token0: 0xabc...
   Token1: 0xdef...
   Index: 123456
   Tx: 0x7c5620a5...
   📝 获取代币信息...
✅ 新交易对已保存: TOKEN0/TOKEN1
   数据库ID: 42
   🔄 更新 Stream 配置...
   ✅ Stream 已更新，现监听 151 个交易对

✅ 处理完成，共 1 个事件
```

---

## 📊 架构对比

### 之前的架构

```
┌─────────────────────────────────────────┐
│           监控系统                       │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  factoryListener.js              │  │
│  │  (ethers.js 监听 PairCreated)    │  │
│  │  ❌ RPC 调用                      │  │
│  └─────────────────────────────────┘  │
│             ↓                          │
│  ┌─────────────────────────────────┐  │
│  │  pairListener.js                 │  │
│  │  (ethers.js 监听 Swap/Mint/Burn) │  │
│  │  ❌ RPC 调用                      │  │
│  │  ❌ 速率限制问题                  │  │
│  └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

### 现在的架构（统一使用 Streams）

```
┌──────────────────────────────────────────────────────┐
│                  QuickNode Streams                    │
│  ✅ 主动推送                                          │
│  ✅ 无 RPC 调用                                       │
│  ✅ 批量处理                                          │
└──────────────────────────────────────────────────────┘
                       ↓ Webhook
┌──────────────────────────────────────────────────────┐
│              webhook-server-raw.js                    │
│  ✅ 手动处理 TCP 分包                                 │
│  ✅ 100% 数据完整性                                   │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│              eventProcessor.js                        │
├──────────────────────────────────────────────────────┤
│  handlePairCreatedEvent()  ← ✅ 新增                  │
│  handleSwapEvent()                                    │
│  handleMintEvent()                                    │
│  handleBurnEvent()                                    │
│  handleSyncEvent()                                    │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│              PostgreSQL 数据库                        │
│  pairs, transactions, liquidity_events                │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 优势总结

| 方面 | ethers.js 监听 | QuickNode Streams |
|------|----------------|-------------------|
| RPC 调用 | ❌ 持续调用 | ✅ 零调用 |
| 速率限制 | ❌ 容易触发 | ✅ 无限制 |
| 可靠性 | ⚠️  需要手动管理 | ✅ 有重试机制 |
| 数据完整性 | ⚠️  可能丢失 | ✅ 保证送达 |
| 架构复杂度 | ❌ 多个监听器 | ✅ 统一处理 |
| 成本 | ❌ 占用 RPC 配额 | ✅ 包含在 Streams 中 |

---

## 📝 PairCreated 事件结构

### 事件定义
```solidity
event PairCreated(
    address indexed token0, 
    address indexed token1, 
    address pair, 
    uint
);
```

### 数据格式

**topics**:
- `topics[0]`: 事件签名 `0x0d3648bd...`
- `topics[1]`: token0 地址（indexed）
- `topics[2]`: token1 地址（indexed）

**data**:
- `pair`: 新创建的交易对地址
- `index`: 交易对索引（第几个交易对）

### 解析示例

```javascript
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// 从 topics 提取
const token0 = ethers.getAddress('0x' + topics[1].slice(26));
const token1 = ethers.getAddress('0x' + topics[2].slice(26));

// 从 data 提取
const [pairAddress, pairIndex] = abiCoder.decode(['address', 'uint256'], data);
```

---

## 🔍 故障排查

### 问题 1: 没有收到 PairCreated 事件

**检查 Stream 配置**:
```bash
node verify-stream-config.js
```

确认：
- ✅ Factory 地址在 `addresses` 列表中
- ✅ PairCreated 签名在 `topics` 列表中

---

### 问题 2: PairCreated 处理失败

**查看日志**:
```bash
tail -f webhook.log | grep "PairCreated"
```

**常见错误**:
- ❌ 代币信息获取失败 → 使用默认值
- ❌ 数据库插入失败 → 检查约束
- ❌ Stream 更新失败 → 检查 API Key

---

### 问题 3: 想临时禁用 Factory 监听

修改 `streamManager.js`:
```javascript
// 更新 Stream 时不包含 Factory
await streamManager.updateStreamAddresses(addresses, false);  // includeFactory = false
```

---

## ✅ 验证清单

- [ ] `streamManager.js` 包含 PairCreated 事件签名
- [ ] `eventProcessor.js` 有 `handlePairCreatedEvent()` 函数
- [ ] QuickNode 过滤器脚本包含 PairCreated 处理
- [ ] Stream 配置中包含 Factory 地址
- [ ] 启动服务器并测试接收 PairCreated 事件
- [ ] 验证新 Pair 自动添加到 Stream 监听列表

---

## 🎉 总结

✅ **现在整个系统使用统一的 QuickNode Streams！**

- **Factory 事件**: PairCreated → Streams
- **Pair 事件**: Swap/Mint/Burn/Sync → Streams
- **无 RPC 调用**: 所有事件都通过 Webhook 推送
- **架构简洁**: 只需维护一个 `webhook-server-raw.js`
- **完全可靠**: TCP 分包处理 + 事件保证送达

**可选**: 如果不再需要 `factoryListener.js`，可以将其移除或作为备用方案保留。

