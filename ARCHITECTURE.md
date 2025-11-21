# 系统架构文档

## 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                            │
│                http://localhost:3000                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/WebSocket
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Application                        │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │   Frontend (UI)  │      │   API Routes     │       │
│  │  - React 组件    │◄─────┤  - REST API      │       │
│  │  - SWR 数据获取  │      │  - 数据查询      │       │
│  └──────────────────┘      └────────┬─────────┘       │
└───────────────────────────────────────┼─────────────────┘
                                        │
                                        │ SQL Queries
                                        ▼
                            ┌────────────────────┐
                            │   PostgreSQL DB    │
                            │  - pools           │
                            │  - transactions    │
                            │  - hourly_stats    │
                            │  - alerts          │
                            └─────────▲──────────┘
                                      │
                                      │ Write Data
                                      │
┌─────────────────────────────────────┴───────────────────┐
│               Monitor Services (Backend)                │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │   BSC Monitor    │      │  Solana Monitor  │       │
│  │  - Web3.js       │      │  - @solana/web3  │       │
│  │  - Event Listener│      │  - Account Sub   │       │
│  └────────┬─────────┘      └────────┬─────────┘       │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            │ WebSocket/HTTP           │ WebSocket/HTTP
            ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│    BSC RPC Node     │    │  Solana RPC Node    │
│  (Binance/NodeReal) │    │   (Official/Helius) │
└─────────────────────┘    └─────────────────────┘
```

## 核心模块

### 1. 监控服务 (Monitor Services)

#### BSC Monitor (`lib/monitors/bsc-monitor.js`)
- **技术**: Web3.js
- **功能**:
  - 连接 BSC RPC 节点
  - 监听 PancakeSwap 池子事件 (Swap, Mint, Burn, Sync)
  - 解析交易数据
  - 写入数据库
  - 触发预警

#### Solana Monitor (`lib/monitors/solana-monitor.js`)
- **技术**: @solana/web3.js
- **功能**:
  - 连接 Solana RPC 节点
  - 订阅账户变化
  - 订阅交易日志
  - 解析 Raydium/Orca 交易
  - 写入数据库

### 2. 数据库层 (Database Layer)

#### 数据库管理 (`lib/db.js`)
- **连接池管理**: PostgreSQL 连接池
- **核心函数**:
  - `query()`: 执行 SQL 查询
  - `transaction()`: 事务处理
  - `getOrCreatePool()`: 池子管理
  - `insertTransaction()`: 交易记录
  - `updatePoolReserves()`: 更新储备量
  - `upsertHourlyStats()`: 小时统计
  - `createAlert()`: 创建预警

#### 数据表设计

**pools 表**: 池子信息
```sql
- id (主键)
- chain (bsc/solana)
- dex (pancakeswap/raydium/orca)
- pool_address (唯一)
- token0/token1 信息
- reserve0/reserve1 (储备量)
- liquidity (流动性)
```

**transactions 表**: 交易记录
```sql
- id (主键)
- pool_id (外键)
- tx_hash (交易哈希)
- event_type (swap/mint/burn)
- amount0_in/out, amount1_in/out
- usd_value (美元价值)
- timestamp (时间戳)
```

**hourly_stats 表**: 小时聚合数据
```sql
- pool_id + hour_timestamp (联合唯一)
- volume_usd (交易量)
- tx_count (交易数)
- price_open/close/high/low (OHLC)
```

**large_trade_alerts 表**: 大额交易预警
```sql
- transaction_id (外键)
- alert_type (预警类型)
- usd_value (交易金额)
- is_read (是否已读)
```

### 3. API 层 (API Routes)

所有 API 路由位于 `pages/api/`：

#### Pools API
- `GET /api/pools/list`: 池子列表（支持链过滤、排序）
- `GET /api/pools/[id]`: 单个池子详情（包含 24h 统计）

#### Transactions API
- `GET /api/transactions/recent`: 最近交易（支持多种过滤）

#### Alerts API
- `GET /api/alerts/list`: 预警列表
- `POST /api/alerts/mark-read`: 标记已读

#### Stats API
- `GET /api/stats/summary`: 统计摘要（总览数据）

### 4. 前端层 (Frontend)

#### 页面结构
- `pages/index.js`: 主页（仪表盘）
- `pages/_app.js`: App 包装器
- `styles/globals.css`: 全局样式

#### 组件
- `StatsOverview`: 统计概览卡片
- `PoolList`: 池子列表表格
- `RecentTransactions`: 最近交易表格
- `AlertList`: 预警列表

#### 数据获取
- **SWR**: 客户端数据获取和缓存
- **自动刷新**: 每 5 秒刷新一次
- **错误处理**: 统一错误显示

## 数据流

### 监控流程

```
1. 区块链事件发生
   ↓
2. Monitor 捕获事件 (WebSocket/Polling)
   ↓
3. 解析事件数据
   ↓
4. 写入 transactions 表
   ↓
5. 更新 pools 储备量
   ↓
6. 更新 hourly_stats 聚合
   ↓
7. 检查是否触发预警
   ↓
8. 如果触发，写入 large_trade_alerts
```

### 前端查询流程

```
1. 用户访问页面
   ↓
2. React 组件挂载
   ↓
3. SWR 发起 API 请求
   ↓
4. Next.js API Route 处理
   ↓
5. 查询 PostgreSQL
   ↓
6. 返回 JSON 数据
   ↓
7. 组件渲染数据
   ↓
8. 5秒后自动刷新 (SWR)
```

## 关键技术决策

### 1. 为什么选择 Next.js？
- ✅ 同时支持前端和 API（一体化）
- ✅ 优秀的开发体验
- ✅ 内置优化和 SEO 支持
- ✅ 易于部署（Vercel）

### 2. 为什么使用 PostgreSQL？
- ✅ 强大的 SQL 查询能力
- ✅ ACID 事务支持
- ✅ 支持复杂聚合和索引
- ✅ 免费且成熟稳定

### 3. 为什么用 WebSocket 监听？
- ✅ 实时性最好（秒级延迟）
- ✅ 不需要轮询，节省资源
- ✅ 事件驱动，精确捕获

### 4. 为什么使用 SWR？
- ✅ 自动缓存和重新验证
- ✅ 支持自动刷新
- ✅ 内置错误处理
- ✅ 轻量级且易用

## 性能优化

### 数据库优化
1. **索引**: 所有常用查询字段都有索引
2. **聚合表**: hourly_stats 预聚合减少实时计算
3. **连接池**: 复用数据库连接
4. **批量插入**: 减少数据库往返

### API 优化
1. **分页**: 限制返回数据量
2. **字段筛选**: 只返回必要字段
3. **缓存**: SWR 客户端缓存

### 前端优化
1. **按需加载**: 组件懒加载
2. **虚拟滚动**: 长列表优化（待实现）
3. **防抖节流**: 减少不必要的请求

## 扩展性考虑

### 水平扩展
- 监控服务可独立运行多个实例
- API 可部署到多个服务器
- 数据库可使用读写分离

### 功能扩展
- 添加更多 DEX 支持（Uniswap、SushiSwap 等）
- 添加更多链支持（Ethereum、Polygon 等）
- 添加通知系统（Telegram、Discord、Email）
- 添加用户系统和自定义配置

### 监控扩展
- 添加 APY/APR 计算
- 添加无常损失计算
- 添加价格趋势分析
- 添加异常检测算法

## 安全考虑

1. **环境变量**: 敏感信息存储在 .env
2. **SQL 注入**: 使用参数化查询
3. **输入验证**: API 参数验证
4. **错误处理**: 不暴露敏感错误信息
5. **速率限制**: 防止 API 滥用（待实现）

## 部署建议

### 开发环境
- 本地 PostgreSQL
- 免费 RPC 节点
- `npm run dev` + `npm run monitor`

### 生产环境
- Vercel (Next.js 应用)
- Vercel Postgres 或 Supabase (数据库)
- VPS (监控服务，需要长期运行)
- 付费 RPC 节点（更稳定）

## 监控和日志

### 日志级别
- INFO: 正常操作（启动、停止、交易）
- WARN: 警告（重连、慢查询）
- ERROR: 错误（连接失败、查询失败）

### 关键指标
- 监控服务运行状态
- 交易处理延迟
- 数据库查询性能
- API 响应时间
- 错误率

## 故障恢复

### 监控服务
- 自动重连机制
- 优雅退出处理
- 断点续传（基于区块号）

### 数据库
- 事务回滚
- 唯一约束防止重复
- 定期备份（建议）

## 待优化项

1. [ ] 集成价格预言机（Chainlink）获取准确的 USD 价值
2. [ ] 实现 Solana 交易解析（当前是简化版本）
3. [ ] 添加图表可视化（交易量、价格走势）
4. [ ] 实现历史数据回填
5. [ ] 添加 WebSocket 实时推送到前端
6. [ ] 实现通知系统
7. [ ] 添加用户认证和个性化配置
8. [ ] 性能监控和告警
9. [ ] 单元测试和集成测试
10. [ ] Docker 容器化部署

## 开发规范

### 代码风格
- 使用 JavaScript (非 TypeScript)
- 函数式编程优先
- 清晰的注释和文档

### Git 工作流
- main 分支保护
- feature 分支开发
- Pull Request 审核

### 命名规范
- 变量: camelCase
- 函数: camelCase
- 组件: PascalCase
- 文件: kebab-case 或 PascalCase

---

最后更新: 2024-11-20

