# LP Monitor 🚀

实时监控 BSC 和 Solana 链上的 LP 池交易量、流动性变化和大额交易。

## 功能特性

- ✅ 实时监控 PancakeSwap (BSC) 和 Raydium/Orca (Solana) 的流动性池
- 📊 交易量统计和历史数据分析
- 💰 价格变化追踪
- 💧 流动性变化监控
- 🚨 大额交易预警
- 📈 可视化仪表盘

## 技术栈

- **前端**: Next.js 14 + React + Recharts
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL
- **区块链交互**: Web3.js (BSC) + @solana/web3.js (Solana)
- **实时数据**: SWR

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

### 3. 设置数据库

确保 PostgreSQL 已安装并运行，然后执行：

```bash
npm run db:setup
```

### 4. 启动监控服务

在一个终端窗口中启动监控服务：

```bash
npm run monitor
```

### 5. 启动 Web 应用

在另一个终端窗口中启动 Next.js 应用：

```bash
npm run dev
```

访问 http://localhost:3000 查看仪表盘。

## 项目结构

```
lp-monitor/
├── pages/              # Next.js 页面和 API 路由
├── components/         # React 组件
├── lib/               # 核心功能库
│   ├── db.js         # 数据库连接
│   └── monitors/     # 区块链监控服务
├── scripts/          # 工具脚本
├── sql/              # 数据库 schema
└── public/           # 静态资源
```

## 监控配置

在 `.env` 文件中配置要监控的池子地址：

```
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
```

## API 接口

- `GET /api/pools/list?chain=bsc` - 获取池子列表
- `GET /api/pools/[id]` - 获取单个池子详情
- `GET /api/transactions/recent?pool_id=1&limit=50` - 获取最近交易
- `GET /api/stats/volume?pool_id=1&period=24h` - 获取交易量统计
- `GET /api/alerts/list` - 获取预警列表

## 开发说明

- 使用 JavaScript (非 TypeScript)
- 遵循 Next.js 13+ App Router 规范
- 数据库使用 PostgreSQL 连接池
- 监控服务使用 WebSocket 实现实时监听

## License

MIT

# lp-monitor
