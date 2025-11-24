# QuickNode Stream 过滤器使用指南

本文档说明如何在 QuickNode Dashboard 中配置 JavaScript 过滤器。

## 📋 提供的过滤器版本

### 1. **标准版** - `quicknode-stream-filter.js`
**推荐用于大多数场景**

特点：
- ✅ 完整的事件数据
- ✅ 详细的统计信息
- ✅ 支持多个交易对
- ✅ 易于调试

适合：需要完整数据的场景

### 2. **优化版** - `quicknode-stream-filter-optimized.js`
**推荐用于大量交易对**

特点：
- ✅ 最小化数据传输
- ✅ 只返回关键字段
- ✅ 可选择性启用事件
- ✅ 减少带宽占用

适合：监控大量交易对，需要控制成本

### 3. **解析版** - `quicknode-stream-filter-with-price.js`
**推荐用于需要即时分析**

特点：
- ✅ 在过滤器中解析事件数据
- ✅ 自动识别大额交易
- ✅ 计算交易方向
- ✅ 减少后端处理

适合：需要实时分析和快速响应

## 🚀 配置步骤

### 第1步：选择过滤器

根据您的需求选择一个过滤器版本，例如使用**标准版**：

打开文件：`quicknode-stream-filter.js`

### 第2步：登录 QuickNode Dashboard

访问：https://dashboard.quicknode.com/streams

### 第3步：创建或编辑 Stream

1. 点击 **"Create Stream"** 或编辑已有的 Stream
2. 在配置页面找到 **"Filter Function"** 或 **"Custom Filter"** 部分

### 第4步：粘贴过滤器代码

1. 复制整个 `quicknode-stream-filter.js` 文件的内容
2. 粘贴到 Filter Function 输入框中

### 第5步：配置监控地址

在过滤器代码中找到 `MONITORED_PAIRS` 数组，添加要监控的交易对地址：

```javascript
const MONITORED_PAIRS = [
  "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
  "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae",
  // 添加更多地址...
];
```

**注意**：
- 地址必须是小写
- 如果留空，将监控所有匹配事件签名的交易对
- 系统会通过 API 自动更新这个列表

### 第6步：测试过滤器

1. 点击 **"Test"** 按钮
2. QuickNode 会用样本数据测试您的过滤器
3. 检查返回结果是否正确

### 第7步：保存配置

点击 **"Save"** 或 **"Create"** 保存配置

## 📊 过滤器返回的数据结构

### 标准版返回格式

```json
{
  "events": [
    {
      "blockNumber": "0x...",
      "blockHash": "0x...",
      "blockTimestamp": "0x...",
      "transactionHash": "0x...",
      "transactionIndex": "0x...",
      "from": "0x...",
      "to": "0x...",
      "gasUsed": "0x...",
      "effectiveGasPrice": "0x...",
      "logIndex": "0x...",
      "address": "0x...",
      "eventType": "swap",
      "topics": ["0x...", "0x...", "0x..."],
      "data": "0x...",
      "removed": false
    }
  ],
  "stats": {
    "totalBlocks": 1,
    "totalReceipts": 50,
    "totalLogs": 200,
    "matchedEvents": 5,
    "eventTypes": {
      "swap": 3,
      "mint": 1,
      "burn": 1,
      "sync": 0
    }
  },
  "config": {
    "monitoredPairsCount": 2,
    "monitoringAll": false
  }
}
```

### 优化版返回格式

```json
{
  "events": [
    {
      "bn": "0x...",      // blockNumber
      "bt": "0x...",      // blockTimestamp
      "tx": "0x...",      // transactionHash
      "li": "0x...",      // logIndex
      "ad": "0x...",      // address
      "tp": "swap",       // type
      "ts": ["0x..."],    // topics
      "dt": "0x...",      // data
      "gp": "0x...",      // gasPrice
      "gu": "0x...",      // gasUsed
      "fr": "0x..."       // from
    }
  ],
  "count": 1
}
```

### 解析版返回格式

```json
{
  "events": [
    {
      "blockNumber": "0x...",
      "blockTimestamp": "0x...",
      "transactionHash": "0x...",
      "logIndex": "0x...",
      "pairAddress": "0x...",
      "eventType": "swap",
      "sender": "0x...",
      "to": "0x...",
      "amount0In": "1000000000000000000",
      "amount1In": "0",
      "amount0Out": "0",
      "amount1Out": "2000000000000000000",
      "direction": "sell",
      "isLarge": true,
      "gasUsed": "0x...",
      "gasPrice": "0x..."
    }
  ],
  "stats": {
    "total": 10,
    "swaps": 7,
    "mints": 2,
    "burns": 1,
    "syncs": 0,
    "largeSwaps": 2
  }
}
```

## 🔧 自定义配置

### 修改事件签名

如果需要监控其他 DEX 或合约，修改事件签名：

```javascript
const EVENT_SIGNATURES = {
  SWAP: "0x你的事件签名",
  MINT: "0x你的事件签名",
  // ...
};
```

### 调整大额交易阈值（解析版）

```javascript
const LARGE_SWAP_THRESHOLD = BigInt("5000000000000000000"); // 5 tokens
```

### 禁用某些事件（优化版）

```javascript
const ENABLED_EVENTS = {
  swap: true,
  mint: true,
  burn: true,
  sync: false  // 禁用 Sync 事件以减少数据量
};
```

## 📝 Webhook 端点调整

如果使用了优化版或解析版过滤器，需要相应修改 Webhook 处理代码。

### 处理优化版数据

```javascript
// src/monitor/streams/eventProcessor.js

async function handleStreamData(batch) {
  const { events } = batch;
  
  for (const event of events) {
    // 将简写字段映射回完整字段
    const log = {
      blockNumber: event.bn,
      blockTimestamp: event.bt,
      transactionHash: event.tx,
      logIndex: event.li,
      address: event.ad,
      topics: event.ts,
      data: event.dt,
      // ...
    };
    
    await processLog(log, event.tp); // 传入事件类型
  }
}
```

### 处理解析版数据

```javascript
// 解析版数据已经包含解析后的字段，可以直接使用
async function handleStreamData(batch) {
  const { events } = batch;
  
  for (const event of events) {
    if (event.eventType === 'swap') {
      // 数据已经解析好了
      await saveSwapEvent({
        pairAddress: event.pairAddress,
        amount0In: event.amount0In,
        amount1In: event.amount1In,
        // 直接使用解析后的字段
      });
    }
  }
}
```

## 🐛 调试技巧

### 1. 检查匹配的日志

在过滤器中添加调试输出：

```javascript
// 在返回前添加
console.log("Matched events:", events.length);
console.log("Sample event:", events[0]);
```

### 2. 验证事件签名

使用在线工具计算事件签名：
- https://emn178.github.io/online-tools/keccak_256.html
- 输入：`Swap(address,uint256,uint256,uint256,uint256,address)`
- 输出应该是：`0xc42079f94a635...`

### 3. 测试特定交易

在 QuickNode Dashboard 中使用特定区块号测试：

1. 找到包含您想测试的交易的区块号
2. 在 Stream 配置中设置 "Start Block" 和 "End Block"
3. 运行测试查看结果

## 📈 性能建议

### 1. 控制监控地址数量

**推荐**：
- 标准版：最多 100 个地址
- 优化版：最多 200 个地址
- 解析版：最多 50 个地址（因为需要解析）

### 2. 选择性启用事件

如果不需要 Sync 事件：
- 数据量可减少约 70%
- 成本降低
- 但失去实时价格更新

### 3. 使用批处理

在 Stream 配置中设置：
```json
{
  "batch_size": 10,
  "batch_timeout_ms": 5000
}
```

## 🔄 动态更新地址列表

虽然可以在过滤器中硬编码地址，但推荐通过 API 动态更新：

```javascript
// 使用 streamManager.js
const { updateStreamAddresses } = require('./src/monitor/streams/streamManager');

// 当检测到新交易对时
await updateStreamAddresses(allPairAddresses);
```

这样过滤器代码保持不变，只通过 API 更新监控列表。

## 🎯 最佳实践

1. **开发阶段**：使用标准版，方便调试
2. **生产环境**：根据需求选择优化版或解析版
3. **定期检查**：在 Dashboard 查看 Stream 统计
4. **监控成本**：关注 QuickNode 的用量统计
5. **备份配置**：将过滤器代码保存到版本控制

## 📚 相关文档

- [STREAMS_SETUP.md](./STREAMS_SETUP.md) - 完整的 Streams 配置指南
- [QuickNode Filter 文档](https://www.quicknode.com/docs/streams/filter-functions)

---

**准备好了吗？** 复制一个过滤器到 QuickNode Dashboard 开始使用吧！🚀

