# QuickNode Stream 过滤器配置指南

本文档提供直接可用的 QuickNode Stream 过滤器配置。

## 🎯 过滤器说明

此过滤器用于监控 PancakeSwap V2 交易对的核心事件：
- **Swap** - 交易事件（买入/卖出）
- **Mint** - 添加流动性
- **Burn** - 移除流动性
- **Sync** - 价格同步

## 📋 方法一：通过 QuickNode Dashboard 配置（推荐）

### 1. 进入 Streams 创建页面

访问：https://dashboard.quicknode.com/streams

点击 **"Create Stream"** 按钮

### 2. 基础配置

**General Settings:**
- **Name**: `BSC PancakeSwap V2 LP Monitor`
- **Network**: `BSC Mainnet`
- **Region**: `USA East` (或选择离您最近的)
- **Dataset**: `block_with_receipts` 或 `logs`

### 3. 过滤器配置

在 **Filter Configuration** 部分：

#### 3.1 Filter Type
选择：`Logs` (事件日志)

#### 3.2 Contract Addresses
**初始留空**，系统运行后会自动更新

或者，如果您已有交易对地址列表，可以添加：
```
0x交易对地址1
0x交易对地址2
...
```

#### 3.3 Topics (事件签名)

**重要！** 在 Topics 配置中，选择 **"OR"** 模式（匹配任意一个事件）

添加以下 4 个事件签名到 **Topic[0]** 数组：

```
0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67
0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f
0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496
0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
```

**事件对应关系：**
| 事件签名 | 事件名称 | 说明 |
|---------|---------|------|
| `0xc42079f94a635...` | Swap | 交易事件（买/卖） |
| `0x4c209b5fc8ad5...` | Mint | 添加流动性 |
| `0xdccd412f0b125...` | Burn | 移除流动性 |
| `0x1c411e9a96e07...` | Sync | 储备量同步 |

#### 3.4 配置示例图示

```
┌─────────────────────────────────────┐
│ Filter Configuration                │
├─────────────────────────────────────┤
│ Filter Type: Logs                   │
│                                     │
│ Contract Addresses (Optional):      │
│ ┌─────────────────────────────────┐ │
│ │ 0x... (留空或添加已知地址)      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Topics:                             │
│ Topic [0]: (OR mode) ✓              │
│ ┌─────────────────────────────────┐ │
│ │ 0xc42079f94a6350d7...           │ │
│ │ 0x4c209b5fc8ad50758...          │ │
│ │ 0xdccd412f0b1252819...          │ │
│ │ 0x1c411e9a96e071241...          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4. Destination 配置

**Destination Type**: `Webhook`

**Webhook URL**: 
- 本地测试：使用 ngrok URL
  ```
  https://xxxx-xxx-xxx.ngrok.io/streams/webhook
  ```
- 生产环境：使用您的服务器域名
  ```
  https://webhooks.yourdomain.com/streams/webhook
  ```

**可选配置：**
- **Max Retries**: `3` (失败重试次数)
- **Batch Size**: `10` (批量推送大小)
- **Batch Timeout**: `5000ms` (批量超时)

### 5. 验证配置

点击 **"Test"** 按钮测试 Webhook 连接

如果成功，您会看到：
- ✅ Webhook endpoint is reachable
- 您的 Webhook 服务器收到测试请求

### 6. 创建并启动

- 点击 **"Create Stream"**
- Stream 创建后会自动启动
- 记录生成的 **Stream ID**
- 将 Stream ID 添加到 `.env.local`

## 📋 方法二：通过 API 创建（高级）

### 使用提供的脚本创建

```bash
# 设置环境变量
export QUICKNODE_API_KEY="your_api_key"
export WEBHOOK_URL="https://your-server.com/streams/webhook"

# 运行创建脚本
node scripts/createStream.js
```

### 手动 API 调用

```bash
curl -X POST https://api.quicknode.com/streams/v1 \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BSC PancakeSwap V2 LP Monitor",
    "network": "bsc-mainnet",
    "dataset": "block_with_receipts",
    "filter_config": {
      "type": "logs",
      "addresses": [],
      "topics": [
        [
          "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
          "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
          "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",
          "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
        ]
      ]
    },
    "destination": {
      "type": "webhook",
      "url": "https://your-server.com/streams/webhook"
    },
    "region": "usa_east"
  }'
```

## 🔍 事件签名详解

### Swap 事件
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
**签名**: `0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67`

**说明**: 用户进行代币交换时触发

### Mint 事件
```solidity
event Mint(
    address indexed sender,
    uint amount0,
    uint amount1
);
```
**签名**: `0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f`

**说明**: 用户添加流动性时触发

### Burn 事件
```solidity
event Burn(
    address indexed sender,
    uint amount0,
    uint amount1,
    address indexed to
);
```
**签名**: `0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496`

**说明**: 用户移除流动性时触发

### Sync 事件
```solidity
event Sync(
    uint112 reserve0,
    uint112 reserve1
);
```
**签名**: `0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1`

**说明**: 池子储备量更新时触发（每次交易/添加/移除后）

## 🎨 过滤器策略

### 策略 1：监听所有事件（推荐）

如上配置，监听所有 4 个事件，获取完整数据。

**优点**：
- ✅ 数据完整
- ✅ 可以计算价格变化
- ✅ 可以检测 Rug Pull

**缺点**：
- ⚠️ Sync 事件频繁，数据量大

### 策略 2：只监听关键事件

如果希望减少数据量，只监听 Swap、Mint、Burn：

```json
"topics": [
  [
    "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
    "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
    "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"
  ]
]
```

**优点**：
- ✅ 数据量减少约 70%
- ✅ 仍保留核心交易信息

**缺点**：
- ❌ 无法实时更新储备量
- ❌ 价格计算不够精确

### 策略 3：只监听大额交易

通过额外过滤条件，只关注大额 Swap：

```json
"filter_config": {
  "type": "logs",
  "addresses": [],
  "topics": [
    ["0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"]
  ],
  "threshold": {
    "value": "1000000000000000000",
    "field": "data.amount0In"
  }
}
```

**优点**：
- ✅ 专注高价值交易
- ✅ 数据量最小

**缺点**：
- ❌ 错过小额但有价值的信息
- ❌ 无流动性变化数据

## ✅ 验证过滤器

### 检查 Stream 状态

在 QuickNode Dashboard:
1. 进入 Streams 列表
2. 查看您的 Stream 状态应为 `Active`
3. 查看 "Events Processed" 数字应在增长

### 本地测试

```bash
# 1. 启动 Webhook 服务器
npm run monitor:streams

# 2. 在另一个终端触发测试事件
curl -X POST http://localhost:3001/streams/webhook \
  -H "Content-Type: application/json" \
  -d '[{
    "logs": [{
      "address": "0x1234...",
      "topics": ["0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"],
      "data": "0x...",
      "blockNumber": "0x123",
      "transactionHash": "0xabc..."
    }]
  }]'
```

### 查看日志

Webhook 服务器应该打印：
```
📨 收到 Streams Webhook 数据
   处理 1 条日志...
💱 Swap: 0x1234... | 0xabc...
✅ 处理完成，共 1 条日志
```

## 🔧 常见问题

### Q: 为什么 Topics 要用数组？

A: Topics 是一个数组的数组，表示过滤逻辑：
```
topics: [
  [topic0_1, topic0_2, ...],  // Topic[0] 匹配任意一个 (OR)
  [topic1_1],                   // Topic[1] 必须匹配 (AND)
]
```

我们的配置是：
```json
"topics": [
  ["Swap", "Mint", "Burn", "Sync"]  // Topic[0]: 匹配任意一个事件
]
```

### Q: Addresses 为什么留空？

A: 因为交易对地址是动态的，系统会：
1. Factory 监听器检测到新交易对
2. 自动调用 API 更新 Stream 的 addresses 列表
3. Stream 开始监听新地址

### Q: 如何手动添加地址？

**方法1**: 在 Dashboard 编辑 Stream
- 进入 Stream 详情页
- 点击 "Edit"
- 在 Addresses 字段添加地址
- 保存

**方法2**: 使用 API
```javascript
const { updateStreamAddresses } = require('./src/monitor/streams/streamManager');

await updateStreamAddresses([
  '0x地址1',
  '0x地址2',
  // ...
]);
```

### Q: 过滤器生效需要多久？

A: 通常是即时的：
- Dashboard 修改：< 5 秒
- API 更新：< 10 秒
- 新地址开始监听：< 30 秒

### Q: 如何监控过滤器性能？

在 QuickNode Dashboard:
1. 进入 Stream 详情页
2. 查看 "Metrics" 标签
3. 可以看到：
   - Events processed (处理的事件数)
   - Webhook success rate (成功率)
   - Average latency (平均延迟)

## 📊 性能优化建议

### 1. 合理设置地址数量

- **推荐**: 100-200 个活跃交易对
- **最大**: 取决于您的 QuickNode 套餐
- **策略**: 优先监听新创建和高交易量的交易对

### 2. 批量设置

```json
"batch_size": 10,
"batch_timeout_ms": 5000
```

- 减少 Webhook 调用次数
- 提高处理效率
- 降低服务器负载

### 3. 重试配置

```json
"max_retries": 3,
"retry_backoff_ms": 1000
```

- 网络波动时自动重试
- 避免数据丢失

### 4. 区域选择

选择离您服务器最近的区域：
- `usa_east` - 美国东部
- `usa_west` - 美国西部
- `europe` - 欧洲
- `asia` - 亚洲

## 📚 参考资源

- [QuickNode Streams 文档](https://www.quicknode.com/docs/streams)
- [过滤器配置指南](https://www.quicknode.com/guides/quicknode-products/streams/how-to-use-filters-with-streams)
- [事件签名计算工具](https://emn178.github.io/online-tools/keccak_256.html)

## 🎉 完成

配置完成后，您的 Stream 将：
1. ✅ 自动监听指定的交易对
2. ✅ 过滤出 Swap、Mint、Burn、Sync 事件
3. ✅ 实时推送到您的 Webhook
4. ✅ 不占用 RPC 配额

---

**祝监控顺利！如有问题请查看 STREAMS_SETUP.md 或提交 Issue。** 🚀

