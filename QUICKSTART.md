# 快速开始指南 🚀

## 前置要求

- Node.js 16+ 
- PostgreSQL 数据库
- BSC RPC 节点访问权限（可选 WebSocket）
- Solana RPC 节点访问权限（可选）

## 步骤 1: 安装依赖

```bash
npm install
```

## 步骤 2: 配置环境变量

复制 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下内容：

```bash
# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/lp_monitor

# BSC RPC（免费节点）
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
# 或使用付费 WebSocket（推荐）
BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# Solana RPC（免费节点）
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# 配置要监控的池子地址
# PancakeSwap WBNB/BUSD 池子
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16

# Raydium SOL/USDC 池子
SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2

# 大额交易阈值（美元）
LARGE_TRADE_THRESHOLD_USD=10000
```

## 步骤 3: 设置数据库

创建 PostgreSQL 数据库，然后运行：

```bash
npm run db:setup
```

你应该看到：

```
✅ 数据库表创建成功！
📊 已创建的表:
  - pools
  - transactions
  - hourly_stats
  - large_trade_alerts
  - monitor_status
```

## 步骤 4: 启动监控服务

在一个终端窗口中：

```bash
npm run monitor
```

你应该看到：

```
🚀 LP Monitor 启动中...
🔷 BSC 监控
✅ 连接成功！当前区块: 34567890
📊 初始化池子: WBNB/BUSD
✅ 池子初始化完成
👀 开始监听事件...
✅ BSC 监控服务已启动
```

## 步骤 5: 启动 Web 应用

在另一个终端窗口中：

```bash
npm run dev
```

访问: http://localhost:3000

## 获取池子地址

### BSC (PancakeSwap)

1. 访问 https://pancakeswap.finance/
2. 选择一个交易对
3. 在浏览器控制台查看网络请求，找到池子地址
4. 或使用 BscScan API 查询

**常用池子示例：**
- WBNB/BUSD: `0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16`
- CAKE/WBNB: `0x0eD7e52944161450477ee417DE9Cd3a859b14fD0`
- USDT/BUSD: `0x7EFaEf62fDdCCa950418312c6C91Aef321375A00`

### Solana (Raydium)

1. 访问 https://raydium.io/
2. 选择一个交易对查看详情
3. 复制池子地址

**常用池子示例：**
- SOL/USDC: `58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2`
- RAY/USDC: `6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg`

## 免费 RPC 节点

### BSC
- https://bsc-dataseed1.binance.org/
- https://bsc-dataseed2.binance.org/
- https://bsc-dataseed3.binance.org/

### Solana
- https://api.mainnet-beta.solana.com (限流较严格)

### 推荐付费节点
- **NodeReal** (BSC): https://nodereal.io/ - 免费层级每天 300M 请求
- **QuickNode** (BSC/Solana): https://quicknode.com/
- **Alchemy** (Solana): https://www.alchemy.com/

## 功能介绍

### 仪表盘
- 📊 实时统计概览
- 💧 监控的池子列表
- 📈 交易量和价格变化
- 🔄 每 5 秒自动刷新

### 交易监控
- 💱 Swap（交换）事件
- ➕ Mint（添加流动性）事件
- ➖ Burn（移除流动性）事件

### 预警系统
- 🚨 大额交易预警（默认 >$10,000）
- 📧 未读预警提醒
- ✅ 标记已读功能

## 故障排除

### 1. 数据库连接失败

```
❌ 错误: 未设置 DATABASE_URL 环境变量
```

**解决方法**: 确保 `.env` 文件中配置了正确的 `DATABASE_URL`

### 2. RPC 连接超时

```
❌ BSC 连接失败: timeout
```

**解决方法**: 
- 检查网络连接
- 尝试使用不同的 RPC 节点
- 考虑使用付费节点

### 3. 没有交易数据

**可能原因**:
- 池子流动性较低，交易不频繁
- 尝试监控更活跃的池子（如 WBNB/BUSD）

### 4. WebSocket 断连

```
WebSocket connection closed
```

**解决方法**:
- 监控服务会自动重连
- 如果频繁断连，考虑使用 HTTP 轮询或付费 WSS 节点

## API 接口文档

所有 API 接口返回 JSON 格式：

### GET /api/pools/list
获取池子列表

**参数**:
- `chain`: bsc | solana | 不传则返回全部
- `sortBy`: volume_24h | tx_count_24h | updated_at
- `limit`: 数量限制（默认 50）

### GET /api/pools/[id]
获取单个池子详情

### GET /api/transactions/recent
获取最近交易

**参数**:
- `pool_id`: 池子 ID
- `chain`: bsc | solana
- `event_type`: swap | mint | burn
- `limit`: 数量限制（默认 50）
- `offset`: 偏移量（用于分页）

### GET /api/alerts/list
获取预警列表

**参数**:
- `is_read`: true | false
- `alert_type`: large_swap | large_liquidity_add | large_liquidity_remove
- `limit`: 数量限制（默认 50）

### POST /api/alerts/mark-read
标记预警为已读

**Body**:
```json
{
  "alert_id": 123
}
```
或
```json
{
  "mark_all": true
}
```

### GET /api/stats/summary
获取统计摘要

**返回**: 总体统计、监控状态、活跃池子、预警数量

## 下一步

1. ✅ 基础监控功能完成
2. 🔄 集成价格预言机（获取 USD 价值）
3. 📊 添加图表可视化（使用 Recharts）
4. 🔔 添加 Telegram/Discord 通知
5. 📱 响应式移动端优化
6. 🎨 添加深色/浅色主题切换

## 需要帮助？

- 查看 [README.md](README.md) 了解更多信息
- 检查 [sql/schema.sql](sql/schema.sql) 了解数据库结构
- 查看各个组件的注释获取详细说明

祝你使用愉快！🎉

