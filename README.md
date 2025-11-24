# BSC 流动性池监控系统

实时监控BSC链上PancakeSwap V2新创建的交易对，追踪交易量、大额交易、流动性变化等套利信息。

## 功能特性

- 🔍 **实时监控** - 自动监听PancakeSwap V2 Factory合约的新交易对创建事件
- 💱 **交易追踪** - 记录每个池子的Swap交易，标记大额交易
- 💧 **流动性监控** - 追踪添加/移除流动性事件，检测Rug Pull风险
- 📊 **数据分析** - 小时级别的交易量统计和流动性分析
- 🚨 **智能警报** - 自动生成套利机会和风险警报
- 📱 **Web界面** - 美观的仪表板展示实时数据

## 技术栈

- **前端**: Next.js 14, React, TailwindCSS
- **后端**: Node.js, Next.js API Routes
- **区块链**: ethers.js v6, QuickNode RPC
- **数据库**: PostgreSQL (原生SQL)
- **任务调度**: node-cron

## 系统要求

- Node.js 18+
- PostgreSQL 14+
- BSC RPC节点访问权限（已配置QuickNode）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/lp_monitor

# BSC RPC节点
BSC_RPC_URL=https://summer-solemn-pond.bsc.quiknode.pro/2d7c7a259ea0c4de731c3fad666f309c6fff111e/

# PancakeSwap V2 合约地址
PANCAKE_FACTORY_ADDRESS=0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E

# 监控配置
LARGE_TRANSACTION_THRESHOLD_USD=10000
```

### 3. 初始化数据库

```bash
# 创建数据库（如果还没创建）
createdb lp_monitor

# 执行数据库Schema
psql -d lp_monitor -f src/db/schema.sql
```

### 4. 启动监控服务

在一个终端窗口中启动区块链监听服务：

```bash
npm run monitor
```

### 5. 启动Web服务

在另一个终端窗口中启动Next.js开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000 查看监控界面。

## 项目结构

```
lp-monitor/
├── src/
│   ├── blockchain/          # 区块链交互
│   │   ├── provider.js      # RPC Provider配置
│   │   └── tokenService.js  # 代币信息服务
│   ├── components/          # React组件
│   │   ├── Layout.js        # 页面布局
│   │   ├── PairCard.js      # 交易对卡片
│   │   └── StatCard.js      # 统计卡片
│   ├── contracts/           # 合约ABI
│   │   └── abis.js          # Factory、Pair、ERC20 ABI
│   ├── db/                  # 数据库
│   │   ├── client.js        # PostgreSQL连接池
│   │   ├── schema.sql       # 数据库Schema
│   │   └── repositories/    # 数据访问层
│   │       ├── tokenRepository.js
│   │       ├── pairRepository.js
│   │       ├── transactionRepository.js
│   │       ├── liquidityRepository.js
│   │       ├── alertRepository.js
│   │       └── analyticsRepository.js
│   ├── monitor/             # 监控服务
│   │   ├── index.js         # 主启动脚本
│   │   ├── analyzer.js      # 数据分析器
│   │   └── listeners/       # 事件监听器
│   │       ├── factoryListener.js
│   │       └── pairListener.js
│   ├── pages/               # Next.js页面
│   │   ├── api/             # API路由
│   │   ├── index.js         # 首页/仪表板
│   │   ├── pairs/           # 交易对页面
│   │   ├── transactions.js  # 交易页面
│   │   └── alerts.js        # 警报页面
│   ├── styles/              # 样式文件
│   │   └── globals.css
│   └── utils/               # 工具函数
│       └── format.js        # 格式化函数
├── package.json
├── jsconfig.json
└── README.md
```

## API接口

### 获取交易对列表
```
GET /api/pairs?limit=50&offset=0
```

### 获取交易对详情
```
GET /api/pairs/[address]
```

### 获取交易列表
```
GET /api/transactions?pairAddress=0x...&limit=50
```

### 获取流动性事件
```
GET /api/liquidity?pairAddress=0x...&limit=50
```

### 获取警报
```
GET /api/alerts?unreadOnly=false&limit=50
PATCH /api/alerts (标记已读)
```

### 获取统计数据
```
GET /api/stats
```

### 获取热门交易对
```
GET /api/analytics/top-pairs?limit=10&hours=24
```

## 数据库表结构

- **tokens** - 代币信息
- **pairs** - 交易对信息
- **transactions** - 交易记录（Swap事件）
- **liquidity_events** - 流动性事件（Mint/Burn）
- **sync_events** - 价格同步事件
- **analytics** - 小时级别统计数据
- **alerts** - 警报信息
- **monitor_state** - 监听器状态

## 监控逻辑

### 混合监听方案

1. **Factory监听器** - 实时监听新交易对创建
2. **Pair监听器** - 为每个交易对创建独立的事件监听器
3. **定时分析任务** - 每小时分析所有交易对，生成统计数据
4. **数据更新任务** - 每10分钟更新分析数据

### 警报类型

- `large_buy` - 大额买入交易
- `large_sell` - 大额卖出交易  
- `liquidity_surge` - 流动性激增
- `liquidity_drain` - 流动性流失（Rug Pull风险）
- `high_volume` - 交易量异常
- `price_spike` - 价格异动

## 使用说明

### 启动顺序

1. 确保PostgreSQL服务运行
2. 启动监控服务 `npm run monitor`
3. 启动Web服务 `npm run dev`

### 查看监控状态

监控服务会在终端输出：
- 新检测到的交易对
- 实时交易事件
- 流动性变化
- 生成的警报
- 系统状态（每30秒）

### Web界面功能

- **仪表板** - 总览所有监控数据
- **交易对列表** - 浏览所有已创建的交易对
- **交易对详情** - 查看单个池子的详细数据和图表
- **大额交易** - 查看最近的大额交易
- **警报中心** - 查看和管理所有警报

## 注意事项

1. **RPC限制** - QuickNode有请求频率限制，避免过于频繁的查询
2. **数据存储** - 长期运行会产生大量数据，建议定期清理历史数据
3. **价格计算** - 当前版本未实现USD价格计算，需要接入价格Oracle
4. **网络稳定性** - 确保网络连接稳定，避免丢失事件

## 后续优化

- [ ] 接入价格Oracle计算USD价值
- [ ] 添加WebSocket实时推送
- [ ] 实现数据可视化图表（K线图、交易量图）
- [ ] 支持更多DEX（PancakeSwap V3、Biswap等）
- [ ] 添加Telegram/Discord机器人通知
- [ ] 实现高级过滤和搜索功能
- [ ] 添加数据导出功能

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题或建议，请通过Issue联系我们。

