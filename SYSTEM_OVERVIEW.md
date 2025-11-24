# BSC 流动性池监控系统 - 整体架构

## 🎯 系统目标

实时监控 BSC 链上 PancakeSwap V2/V3 的流动性池，追踪交易量、大额交易、流动性变化等套利价值信息。

## 📊 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      BSC 区块链                              │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ PancakeSwap V2   │         │ PancakeSwap V3   │         │
│  │ Factory          │         │ Factory          │         │
│  │ 0xcA143Ce3...    │         │ 0x0BFbCF9f...    │         │
│  └────────┬─────────┘         └─────────┬────────┘         │
│           │ PairCreated 事件            │                   │
│           ↓                             ↓                   │
│  ┌──────────────────────────────────────────────┐          │
│  │         交易对 (Pair Contracts)              │          │
│  │  Swap, Mint, Burn, Sync 事件                │          │
│  └────────────────┬─────────────────────────────┘          │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ↓
┌───────────────────────────────────────────────────────────┐
│              QuickNode RPC & Streams                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  方案A：传统 RPC 监听（有速率限制）                  │ │
│  │  - eth_newFilter                                     │ │
│  │  - eth_getLogs                                       │ │
│  │  问题：15请求/秒限制 ❌                              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  方案B：Streams + Webhook（推荐）✅                  │ │
│  │  1. JavaScript 过滤器（服务端执行）                  │ │
│  │  2. 过滤匹配的事件                                   │ │
│  │  3. Webhook 推送到您的服务器                         │ │
│  │  优势：不占用 RPC 配额，可监控 100+ 交易对          │ │
│  └──────────────────┬──────────────────────────────────┘ │
└─────────────────────┼──────────────────────────────────────┘
                      │ Webhook POST
                      ↓
┌───────────────────────────────────────────────────────────┐
│              您的监控系统 (Node.js)                        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Factory 监听器 (factoryListener.js)          │   │
│  │     - 监听 PairCreated 事件                       │   │
│  │     - 获取代币信息                                 │   │
│  │     - 保存到数据库                                 │   │
│  │     - 更新 Streams 配置                           │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────┴───────────────────────────────┐   │
│  │  2. Webhook 服务器 (webhookServer.js)            │   │
│  │     - 接收 Streams 推送的数据                     │   │
│  │     - 支持两种格式：                               │   │
│  │       * 数组格式 [{logs: [...]}]                  │   │
│  │       * 对象格式 {events: [...], stats: {...}}   │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────┴───────────────────────────────┐   │
│  │  3. 事件处理器 (eventProcessor.js)               │   │
│  │     - 解析事件数据                                 │   │
│  │     - Swap → 交易记录                             │   │
│  │     - Mint → 流动性添加                           │   │
│  │     - Burn → 流动性移除                           │   │
│  │     - Sync → 价格/储备量更新                      │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────┴───────────────────────────────┐   │
│  │  4. 数据分析器 (analyzer.js)                     │   │
│  │     - 计算 1 小时交易量                           │   │
│  │     - 识别大额交易                                 │   │
│  │     - 流动性净变化                                 │   │
│  │     - 生成套利信号                                 │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────┴───────────────────────────────┐   │
│  │  5. 警报生成器 (alertRepository.js)              │   │
│  │     - 大额买入/卖出                               │   │
│  │     - 流动性激增                                   │   │
│  │     - Rug Pull 风险（>50% 流动性移除）           │   │
│  │     - 异常交易量                                   │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│                     ↓                                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │         PostgreSQL 数据库                          │  │
│  │  - tokens (代币信息)                              │  │
│  │  - pairs (交易对)                                 │  │
│  │  - transactions (交易记录)                        │  │
│  │  - liquidity_events (流动性事件)                 │  │
│  │  - analytics (小时统计)                          │  │
│  │  - alerts (警报)                                  │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │                                   │
│                      ↓                                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │      定时任务 (cron jobs)                          │  │
│  │  - 每小时：全面分析所有交易对                      │  │
│  │  - 每10分钟：更新小时统计数据                      │  │
│  │  - 每30分钟：同步 Streams 地址列表                │  │
│  └───────────────────┬───────────────────────────────┘  │
└──────────────────────┼─────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────────┐
│               Next.js Web 应用                            │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Routes (/api/*)                              │   │
│  │  - /api/pairs - 获取交易对列表                    │   │
│  │  - /api/pairs/[address] - 交易对详情             │   │
│  │  - /api/transactions - 大额交易                  │   │
│  │  - /api/liquidity - 流动性事件                   │   │
│  │  - /api/alerts - 警报列表                        │   │
│  │  - /api/stats - 总体统计                         │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────┴───────────────────────────────┐   │
│  │  前端页面 (React)                                 │   │
│  │  - / - 仪表板                                     │   │
│  │  - /pairs - 交易对列表                           │   │
│  │  - /pairs/[address] - 交易对详情                 │   │
│  │  - /transactions - 大额交易                      │   │
│  │  - /alerts - 警报中心                            │   │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 🔄 数据流详解

### 1️⃣ 新交易对创建流程

```
BSC 区块链
  ↓ (用户创建流动性池)
Factory 合约发出 PairCreated 事件
  ↓
factoryListener.js 监听到事件
  ↓
获取代币信息 (tokenService.js)
  ├─ Token0: name, symbol, decimals
  └─ Token1: name, symbol, decimals
  ↓
保存到数据库
  ├─ INSERT INTO tokens (...)
  └─ INSERT INTO pairs (...)
  ↓
更新 Streams 配置 (streamManager.js)
  └─ 将新交易对地址添加到监听列表
```

### 2️⃣ 交易事件处理流程 (Streams 方案)

```
用户在 PancakeSwap 交易
  ↓
Pair 合约发出 Swap 事件
  ↓
QuickNode Streams 服务器
  ├─ 运行 JavaScript 过滤器
  ├─ 检查地址是否在监听列表
  └─ 匹配事件签名
  ↓
Webhook 推送到您的服务器
  └─ POST /streams/webhook
  ↓
webhookServer.js 接收数据
  ├─ 验证格式
  └─ 调用 handleFilteredEvents()
  ↓
eventProcessor.js 处理事件
  ├─ 解析 topics 和 data
  ├─ 提取交易信息
  └─ 调用对应的处理函数
  ↓
根据事件类型处理
  ├─ Swap → handleSwapEvent()
  │   └─ INSERT INTO transactions (...)
  ├─ Mint → handleMintEvent()
  │   └─ INSERT INTO liquidity_events (..., type='mint')
  ├─ Burn → handleBurnEvent()
  │   ├─ INSERT INTO liquidity_events (..., type='burn')
  │   └─ checkLiquidityDrain() - 检查 Rug Pull 风险
  └─ Sync → handleSyncEvent()
      └─ UPDATE pairs SET reserve0=..., reserve1=...
  ↓
analyzer.js 生成警报（如果需要）
  └─ INSERT INTO alerts (...)
```

### 3️⃣ 数据分析流程

```
定时任务触发 (每10分钟)
  ↓
analyzer.js - updateHourlyAnalytics()
  ↓
从数据库查询数据
  ├─ 最近1小时的交易
  ├─ 最近1小时的流动性事件
  └─ 当前储备量
  ↓
计算指标
  ├─ 交易数量
  ├─ 交易量 (volume)
  ├─ 大额交易数
  ├─ 流动性净变化
  └─ 价格变化
  ↓
保存到 analytics 表
  └─ INSERT INTO analytics (...) ON CONFLICT UPDATE
  ↓
生成警报（如果满足条件）
  ├─ 流动性激增 (addCount > 10)
  ├─ 交易量异常 (transactionCount > 100)
  └─ 流动性流失 (removeCount > addCount)
```

### 4️⃣ Web 界面数据流

```
用户访问网页
  ↓
Next.js 前端
  ↓
调用 API (fetch)
  └─ GET /api/pairs
  ↓
API Route 处理
  └─ pairRepository.getRecentPairs()
  ↓
查询数据库
  └─ SELECT * FROM pairs JOIN tokens ...
  ↓
返回 JSON
  └─ { success: true, data: {...} }
  ↓
前端渲染
  └─ 显示交易对卡片/列表/详情
```

## 🔑 关键组件说明

### 监听层

| 组件 | 文件 | 作用 | 依赖 |
|------|------|------|------|
| **Factory 监听器** | `factoryListener.js` | 检测新交易对创建 | ethers.js, RPC |
| **Webhook 服务器** | `webhookServer.js` | 接收 Streams 推送 | Express |
| **事件处理器** | `eventProcessor.js` | 解析和保存事件 | ethers.js |

### 数据层

| 组件 | 文件 | 作用 | 表 |
|------|------|------|-----|
| **数据库客户端** | `db/client.js` | PostgreSQL 连接池 | - |
| **代币仓库** | `tokenRepository.js` | 代币 CRUD | tokens |
| **交易对仓库** | `pairRepository.js` | 交易对 CRUD | pairs |
| **交易仓库** | `transactionRepository.js` | 交易 CRUD | transactions |
| **流动性仓库** | `liquidityRepository.js` | 流动性事件 CRUD | liquidity_events |
| **警报仓库** | `alertRepository.js` | 警报 CRUD | alerts |
| **分析仓库** | `analyticsRepository.js` | 统计数据 CRUD | analytics |

### 分析层

| 组件 | 文件 | 作用 |
|------|------|------|
| **数据分析器** | `analyzer.js` | 计算统计指标 |
| **警报生成器** | 集成在各处理器中 | 识别异常并生成警报 |

### 展示层

| 组件 | 路径 | 作用 |
|------|------|------|
| **仪表板** | `/` | 总览统计 |
| **交易对列表** | `/pairs` | 浏览所有池子 |
| **交易对详情** | `/pairs/[address]` | 单个池子详情 |
| **大额交易** | `/transactions` | 高价值交易 |
| **警报中心** | `/alerts` | 套利信号 |

## 📝 数据库表结构

### 核心表

```sql
tokens (代币)
├─ address (主键)
├─ name, symbol, decimals
└─ total_supply

pairs (交易对)
├─ address (主键)
├─ token0_address, token1_address
├─ reserve0, reserve1
└─ created_at

transactions (交易)
├─ pair_address (外键)
├─ transaction_hash
├─ amount0_in/out, amount1_in/out
├─ is_large (大额标记)
└─ timestamp

liquidity_events (流动性)
├─ pair_address (外键)
├─ event_type (mint/burn)
├─ amount0, amount1
└─ timestamp

analytics (小时统计)
├─ pair_address (外键)
├─ hour_timestamp
├─ transaction_count, volume
├─ liquidity_add/remove_count
└─ net_liquidity_change

alerts (警报)
├─ pair_address (外键)
├─ alert_type (large_buy/sell/liquidity_surge/drain)
├─ severity (low/medium/high)
└─ timestamp
```

## ⚙️ 配置文件

### 环境变量 (.env.local)

```bash
# 数据库
DATABASE_URL=postgresql://...

# RPC
BSC_RPC_URL=https://...quicknode.pro/...

# Streams (推荐方案)
QUICKNODE_STREAM_ID=...
QUICKNODE_API_KEY=...
WEBHOOK_PORT=3001

# 合约地址
PANCAKE_FACTORY_ADDRESS=0xcA143Ce3...  # V2
# 或
PANCAKE_V3_FACTORY_ADDRESS=0x0BFbCF9f...  # V3

# 阈值
LARGE_TRANSACTION_THRESHOLD_USD=10000
```

## 🚀 启动流程

### 开发环境

```bash
# 终端1：启动 Streams 监控
npm run monitor:streams

# 终端2：启动 Web 服务
npm run dev
```

### 系统初始化顺序

```
1. 加载环境变量
   ↓
2. 连接数据库
   ↓
3. 测试 BSC RPC 连接
   ↓
4. 启动 Webhook 服务器 (端口 3001)
   ↓
5. 启动 Factory 监听器
   ↓
6. 初始化/更新 Streams 配置
   ↓
7. 加载已有交易对（可选）
   ↓
8. 设置定时任务
   ├─ 每小时分析
   ├─ 每10分钟更新
   └─ 每30分钟同步
   ↓
9. 系统运行中
```

## 📊 监控指标

### 实时指标

- ✅ 监控中的交易对数量
- ✅ 最近1小时交易数
- ✅ 最近1小时大额交易数
- ✅ 最近1小时流动性变化
- ✅ 未读警报数量

### 历史指标

- ✅ 24小时交易量
- ✅ 小时级别统计
- ✅ 价格变化趋势
- ✅ 流动性净变化

## 🎯 套利信号类型

### 1. 流动性激增
```
条件：1小时内 >10 次添加流动性
信号：新的交易机会，价格可能波动
```

### 2. 大额买入
```
条件：单笔交易 > $10,000
信号：可能引发价格上涨
```

### 3. 流动性流失
```
条件：移除次数 > 添加次数 && 净流出为负
信号：风险警告，可能 Rug Pull
```

### 4. 异常交易量
```
条件：1小时内 >100 笔交易
信号：市场热点，关注机会
```

### 5. Rug Pull 风险
```
条件：单次移除 >50% 流动性
信号：高风险警报，立即退出
```

## 🔄 系统特点

### 优势

1. **实时性** - Webhook 推送，延迟 <1 秒
2. **可扩展** - 可监控 100+ 交易对（Streams 方案）
3. **完整性** - 记录所有事件，不遗漏
4. **智能化** - 自动分析和生成警报
5. **可视化** - Web 界面实时展示

### 技术亮点

1. **混合监听方案** - Factory (传统) + Pairs (Streams)
2. **服务端过滤** - 减少网络传输和处理负担
3. **事件驱动** - 被动接收，不主动轮询
4. **原生 SQL** - 高性能数据操作
5. **定时分析** - 后台计算统计指标

## 📈 性能指标

| 指标 | 传统方案 | Streams 方案 |
|------|---------|-------------|
| RPC 请求/秒 | ~40 | ~4 |
| 可监控交易对 | ~15 | 100-200 |
| 延迟 | <1s | <1s |
| 成本 | RPC 配额 | Streams 配额 |
| 稳定性 | 易触发限制 | 高 |

## 🎓 总结

这是一个**事件驱动的实时监控系统**：

1. **监听新池子** - Factory 合约
2. **追踪交易事件** - Streams Webhook
3. **实时分析** - 计算指标和警报
4. **数据持久化** - PostgreSQL
5. **可视化展示** - Next.js Web 应用

核心理念：**被动接收 + 智能分析 + 实时展示**

---

**这就是整个系统的完整逻辑！** 🚀

