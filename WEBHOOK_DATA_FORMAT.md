# QuickNode Webhook 数据格式说明

## 📡 Webhook 数据格式

### 完整数据结构

```json
{
  "config": {
    "monitoredPairsCount": 1,
    "monitoringAll": false
  },
  "events": [
    {
      "address": "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
      "data": "0x...",
      "effectiveGasPrice": "0x3dfd240",
      "eventType": "swap",
      "from": "0x978706927cc92032ec52e2db7f08cce7f90c038c",
      "gasUsed": "0x4032d",
      "logIndex": "0x194",
      "removed": false,
      "to": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
      "topics": [
        "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
        "0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e",
        "0x0000000000000000000000001e92d477473295e9f3b0f630f010b4ef8658da94"
      ],
      "transactionHash": "0x7c5620a5cb8d549a44a8c4475bb9f2f367d6394a61dc51239e871a6ffe584bb5",
      "transactionIndex": "0x4d"
    }
  ],
  "stats": {
    "eventTypes": {
      "burn": 0,
      "mint": 0,
      "swap": 2,
      "sync": 2
    },
    "matchedEvents": 4,
    "totalBlocks": 1,
    "totalLogs": 1251,
    "totalReceipts": 147
  }
}
```

## 🔍 字段说明

### 顶层字段

- **config**: 配置信息
  - `monitoredPairsCount`: 监听的交易对数量
  - `monitoringAll`: 是否监听所有交易对

- **events**: 事件数组，包含所有匹配的事件

- **stats**: 统计信息
  - `eventTypes`: 各类事件的数量
  - `matchedEvents`: 匹配的事件总数
  - `totalBlocks`: 处理的区块数
  - `totalLogs`: 总日志数
  - `totalReceipts`: 总交易回执数

### Event 对象字段

- **address**: 合约地址（交易对地址）
- **data**: 事件数据（十六进制编码）
- **topics**: 事件主题数组
  - `topics[0]`: 事件签名
  - `topics[1+]`: 索引参数
- **transactionHash**: 交易哈希
- **blockNumber**: 区块号（如果有）
- **logIndex**: 日志索引
- **eventType**: 事件类型（由过滤器标注）
  - `swap`: 交换事件
  - `mint`: 添加流动性
  - `burn`: 移除流动性
  - `sync`: 同步事件

## 📋 事件签名对照表

### PancakeSwap V2

| 事件类型 | 签名 |
|---------|------|
| Swap | `0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822` |
| Mint | `0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f` |
| Burn | `0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496` |
| Sync | `0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1` |

### PancakeSwap V3

| 事件类型 | 签名 |
|---------|------|
| Swap | `0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83` |
| Mint | `0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde` |
| Burn | `0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c` |

## 🔧 如何识别版本

根据 `topics[0]` (事件签名) 判断：

```javascript
const signature = event.topics[0];

// V2 Swap
if (signature === '0xd78ad95f...') {
  // PancakeSwap V2 Swap
}

// V3 Swap
if (signature === '0x19b47279...') {
  // PancakeSwap V3 Swap
}
```

## 📊 数据解析

### V2 Swap 事件

```solidity
event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In,
    uint amount0Out,
    uint amount1Out,
    address indexed to
);
```

解析：
- `topics[1]`: sender
- `topics[2]`: to
- `data`: [amount0In, amount1In, amount0Out, amount1Out]

### V3 Swap 事件

```solidity
event Swap(
    address indexed sender,
    address indexed recipient,
    int256 amount0,
    int256 amount1,
    uint160 sqrtPriceX96,
    uint128 liquidity,
    int24 tick
);
```

解析：
- `topics[1]`: sender
- `topics[2]`: recipient
- `data`: [amount0, amount1, sqrtPriceX96, liquidity, tick]

**注意**: V3 使用有符号整数，负数表示流出，正数表示流入

## 🧪 测试

使用提供的测试脚本：

```bash
# 1. 启动 webhook 服务
npm run monitor:streams

# 2. 在另一个终端运行测试
node test-webhook-data.js
```

## 🔍 调试

### 查看原始数据

在 `webhookServer.js` 中已经添加了详细的日志：

```javascript
console.log('📨 收到 Streams Webhook 数据');
console.log('   Payload 类型:', typeof payload);
console.log('   是否为数组:', Array.isArray(payload));
console.log('   Payload 的键:', Object.keys(payload));
```

### 常见问题

1. **收到数据但不处理**
   - 检查事件签名是否匹配
   - 查看 `eventProcessor.js` 中的 `EVENT_SIGNATURES`

2. **数据格式错误**
   - 确认 QuickNode JavaScript 过滤器返回正确格式
   - 检查 `events` 数组是否存在

3. **V2/V3 混合**
   - 系统现在同时支持 V2 和 V3
   - 根据事件签名自动识别版本

## 📚 相关文档

- `SYSTEM_OVERVIEW.md` - 系统架构
- `STREAMS_SETUP.md` - Streams 配置
- `V3_SUPPORT.md` - V3 支持详情

