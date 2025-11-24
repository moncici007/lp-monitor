# 🔍 BSC LP Monitor

BSC 链上流动性池监控系统 - 实时追踪 PancakeSwap V2/V3 交易对

---

## ✨ 功能特性

- 🔄 **实时监控**: 自动监控新创建的交易对
- 📊 **交易分析**: 追踪交易量、大额交易
- 💧 **流动性监控**: 检测流动性添加/移除
- 🚨 **异常告警**: 识别潜在的 rug pull 和异常活动
- 🎯 **套利信号**: 发现有价值的套利机会
- 🌐 **Web 界面**: 可视化展示所有监控数据

---

## 🏗️ 技术栈

- **前端**: Next.js 14, React, TailwindCSS
- **后端**: Node.js, Express
- **数据库**: PostgreSQL
- **区块链**: ethers.js, QuickNode RPC + Streams
- **监控**: PancakeSwap V2 & V3

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+
- QuickNode 账户（已配置）

### 安装

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
# .env 文件已包含必要配置

# 3. 初始化数据库
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor -f src/db/schema.sql
```

### 运行

#### 方式 1: 完整监控 (推荐)

```bash
# 1. 配置 Webhook (首次运行)
node configure-stream.js

# 2. 启动监控系统
npm run monitor:streams
```

#### 方式 2: 仅 Web 界面

```bash
npm run dev
```

访问: http://localhost:3000

---

## 📚 文档导航

### 🌟 必读文档

| 文档 | 说明 | 优先级 |
|------|------|--------|
| [NEXT_STEPS.md](./NEXT_STEPS.md) | **下一步操作清单** | ⭐⭐⭐ |
| [START_MONITORING.md](./START_MONITORING.md) | **完整启动指南** | ⭐⭐⭐ |
| [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) | **最新更新说明** | ⭐⭐⭐ |

### 📖 参考文档

| 文档 | 说明 |
|------|------|
| [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) | 系统架构总览 |
| [STREAMS_SETUP.md](./STREAMS_SETUP.md) | QuickNode Streams 配置 |
| [WEBHOOK_DATA_FORMAT.md](./WEBHOOK_DATA_FORMAT.md) | Webhook 数据格式 |
| [V3_SUPPORT.md](./V3_SUPPORT.md) | PancakeSwap V3 支持 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 故障排查指南 |

### 🛠️ 工具指南

| 文档 | 说明 |
|------|------|
| [HOW_TO_GET_STREAM_ID.md](./HOW_TO_GET_STREAM_ID.md) | 如何获取 Stream ID |
| [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) | 环境变量配置 |

---

## 🛠️ 可用命令

### 配置和诊断

```bash
node verify-stream-config.js    # 验证 Stream 配置
node configure-stream.js         # 配置 Webhook 和启动 Stream
./list-streams.sh                # 列出所有 Streams
```

### 测试

```bash
node test-webhook-data.js        # 测试 Webhook 数据处理
node test-webhook.js             # 发送测试数据到 Webhook
```

### 运行

```bash
npm run dev                      # 启动前端开发服务器
npm run monitor:streams          # 启动完整监控系统
npm run build                    # 构建生产版本
npm start                        # 启动生产服务器
```

---

## 📊 系统架构

```
┌─────────────────┐
│  BSC Blockchain │
│  (PancakeSwap)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QuickNode RPC   │  ← Factory 事件监听
│   + Streams     │  ← 交易对事件推送
└────────┬────────┘
         │
         ▼ Webhook
┌─────────────────┐
│  LP Monitor     │
│  ├─ Listener    │  ← 处理新交易对
│  ├─ Processor   │  ← 解析事件数据
│  ├─ Analyzer    │  ← 数据分析
│  └─ Alerter     │  ← 异常检测
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │ ←─→ │   Next.js Web   │
│   (数据存储)     │     │   (可视化界面)   │
└─────────────────┘     └─────────────────┘
```

---

## 🔧 核心功能

### 1. 交易对监控

- 监听 PancakeSwap V2 Factory 的 `PairCreated` 事件
- 自动添加新交易对到 QuickNode Stream
- 支持 V2 和 V3 池子

### 2. 事件处理

**支持的事件**:
- `Swap` - 交换事件
- `Mint` - 添加流动性
- `Burn` - 移除流动性
- `Sync` - 储备同步

**自动识别**:
- PancakeSwap V2 和 V3
- 根据事件签名自动选择解析逻辑

### 3. 数据分析

- **交易量计算**: 1小时滚动交易量
- **大额交易**: 识别异常大额交易
- **流动性追踪**: 监控流动性变化趋势
- **Rug Pull 检测**: 识别可疑的流动性移除

### 4. Web 界面

- 📊 仪表盘 - 实时统计
- 📋 交易对列表 - 所有监控的交易对
- 🔍 交易对详情 - 单个交易对的完整信息
- 🚨 告警中心 - 异常活动提醒

---

## 🎯 使用场景

### 1. 新币发现

实时监控新创建的交易对，抓住早期投资机会。

### 2. 流动性监控

追踪大额流动性变化，提前发现可能的抛售。

### 3. 套利机会

分析交易量和价格变化，发现套利机会。

### 4. 风险规避

检测 rug pull 信号，避免投资风险。

---

## ⚙️ 配置说明

### 环境变量

```bash
# BSC RPC 节点
BSC_RPC_URL=https://summer-solemn-pond.bsc.quiknode.pro/...

# QuickNode Streams
QUICKNODE_STREAM_ID=382f116e-dad2-4595-a51b-4b571f7e7c50
QUICKNODE_API_KEY=QN_4c0e978dc96c4cc4b92a633ca77d6876

# 数据库
DATABASE_URL=postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor

# Webhook
WEBHOOK_PORT=3001
```

### 合约地址

```javascript
// PancakeSwap V2 Factory
0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73

// 其他合约地址在代码中配置
```

---

## 🔍 监控指标

### 交易分析

- ✅ 1小时交易量
- ✅ 交易笔数
- ✅ 大额交易识别
- ✅ 价格影响分析

### 流动性分析

- ✅ 总流动性价值
- ✅ 流动性变化趋势
- ✅ 添加/移除事件
- ✅ 异常流动性移除检测

### 异常检测

- ✅ Rug Pull 风险
- ✅ 闪电贷攻击
- ✅ 价格操纵
- ✅ 可疑交易模式

---

## 🐛 故障排查

### 常见问题

1. **Stream 404 错误** ✅ 已修复
2. **Webhook 收不到数据** → 查看 `TROUBLESHOOTING.md`
3. **数据库连接失败** → 检查 PostgreSQL 服务
4. **V3 事件不处理** ✅ 已支持

### 诊断工具

```bash
# 验证配置
node verify-stream-config.js

# 测试 Webhook
node test-webhook-data.js

# 查看 Stream 列表
./list-streams.sh
```

---

## 📈 性能优化

### 已实现

- ✅ QuickNode Streams 避免 RPC 限制
- ✅ 数据库索引优化
- ✅ 批量数据处理
- ✅ 事件去重

### 建议优化

- 🔄 添加 Redis 缓存
- 🔄 数据库分区
- 🔄 WebSocket 实时推送

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📜 许可证

MIT License

---

## 🔗 相关链接

- [QuickNode Documentation](https://www.quicknode.com/docs)
- [PancakeSwap V2 Docs](https://docs.pancakeswap.finance/)
- [PancakeSwap V3 Docs](https://docs.pancakeswap.finance/products/pancakeswap-exchange/v3)
- [ethers.js Documentation](https://docs.ethers.org/)

---

## 📞 支持

遇到问题？

1. 📖 查看 [NEXT_STEPS.md](./NEXT_STEPS.md)
2. 🔧 运行 `node verify-stream-config.js`
3. 📚 阅读 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**最后更新**: 2024年11月24日

**当前状态**: ✅ 已就绪，等待配置 Webhook

**下一步**: 查看 [NEXT_STEPS.md](./NEXT_STEPS.md) 开始使用 🚀
