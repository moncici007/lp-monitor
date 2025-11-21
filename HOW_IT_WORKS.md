# LP Monitor 工作原理 🔍

## 📖 概述

LP Monitor 是一个**实时**监控系统，它持续监听区块链上的交易事件，自动捕获、解析并存储流动性池的所有活动。

---

## 🔄 监控机制详解

### 1. 事件驱动监听（Event-Driven）

监控服务使用 **事件监听器** 来实时捕获链上数据，而不是轮询。

```javascript
// BSC 监控示例
contract.events.Swap()
  .on('data', (event) => {
    // 新的 Swap 交易发生时自动触发
    console.log('💱 检测到交易:', event);
    // 自动保存到数据库
  })
```

**工作流程**：
```
区块链新交易 → 发出事件 → 监听器捕获 → 解析数据 → 存入数据库 → 前端显示
     ↓            ↓           ↓          ↓         ↓          ↓
  几秒钟内      实时接收    毫秒级     格式化    持久化     自动刷新
```

---

## 🎯 监控的事件类型

### BSC (PancakeSwap)

#### 1. **Swap 事件**（交换）
```solidity
event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In,
    uint amount0Out,
    uint amount1Out,
    address indexed to
)
```

**监控内容**：
- 交易发起者地址
- 输入代币数量
- 输出代币数量
- 交易价格
- 交易时间

**触发时机**：用户在 DEX 上交换代币时

---

#### 2. **Mint 事件**（添加流动性）
```solidity
event Mint(
    address indexed sender,
    uint amount0,
    uint amount1
)
```

**监控内容**：
- 添加的 Token0 数量
- 添加的 Token1 数量
- 流动性变化

**触发时机**：用户添加流动性时

---

#### 3. **Burn 事件**（移除流动性）
```solidity
event Burn(
    address indexed sender,
    uint amount0,
    uint amount1,
    address indexed to
)
```

**监控内容**：
- 移除的 Token0 数量
- 移除的 Token1 数量
- 流动性减少

**触发时机**：用户移除流动性时

---

#### 4. **Sync 事件**（储备量同步）
```solidity
event Sync(
    uint112 reserve0,
    uint112 reserve1
)
```

**监控内容**：
- 更新后的储备量
- 价格变化

**触发时机**：任何交易后自动触发

---

## ⚙️ 持续监控的实现

### HTTP 模式（当前使用）

使用 HTTP 连接，Web3.js 会自动轮询新区块：

```javascript
// 连接到 RPC 节点
this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

// 订阅事件（Web3.js 自动轮询）
contract.events.Swap()
  .on('data', handleEvent)
  .on('error', handleError);
```

**工作原理**：
1. Web3.js 每隔一段时间（通常 1-3 秒）查询新区块
2. 检查是否有新的事件
3. 如果有，触发 `on('data')` 回调
4. 自动持续这个过程

**优点**：
- ✅ 简单稳定
- ✅ 适合免费 RPC 节点
- ✅ 自动重连

**缺点**：
- ⚠️ 有轻微延迟（1-5 秒）
- ⚠️ 消耗更多 RPC 请求

---

### WebSocket 模式（推荐用于付费节点）

使用 WebSocket 连接，实时推送：

```javascript
// 连接到 WebSocket RPC
this.web3 = new Web3(new Web3.providers.WebsocketProvider(wssUrl));

// 实时推送，无需轮询
contract.events.Swap()
  .on('data', handleEvent)
```

**工作原理**：
1. 与 RPC 节点建立持久连接
2. 新事件发生时，节点主动推送
3. 实时接收，无延迟

**优点**：
- ✅ 实时性最好（秒级）
- ✅ 节省 RPC 请求
- ✅ 延迟最低

**缺点**：
- ⚠️ 需要付费 WebSocket 节点
- ⚠️ 连接可能断开需要重连

---

## 📊 数据流转过程

### 完整流程

```
1. 用户在 PancakeSwap 进行交易
         ↓
2. 智能合约执行，发出 Swap 事件
         ↓
3. 事件被写入区块
         ↓
4. RPC 节点接收到新区块
         ↓
5. LP Monitor 的事件监听器捕获事件
         ↓
6. handleSwapEvent() 函数被触发
         ↓
7. 解析事件数据：
   - 交易哈希
   - 金额
   - 价格
   - 时间戳
         ↓
8. 写入 PostgreSQL 数据库：
   - transactions 表（交易记录）
   - hourly_stats 表（聚合统计）
   - large_trade_alerts 表（如果是大额交易）
         ↓
9. 更新池子储备量（pools 表）
         ↓
10. 前端每 5 秒自动刷新，获取新数据
         ↓
11. 用户在浏览器看到最新交易
```

---

## 🚀 启动和持续运行

### 启动监控服务

```bash
npm run monitor
```

**启动过程**：
```
1. 加载环境变量 (.env)
2. 连接 PostgreSQL 数据库
3. 连接 BSC/Solana RPC 节点
4. 初始化每个池子：
   - 获取代币信息
   - 读取当前储备量
   - 创建/更新数据库记录
5. 订阅所有事件（Swap, Mint, Burn, Sync）
6. 进入监听状态（持续运行）
7. 等待事件触发...
```

### 持续运行

监控服务启动后会**一直运行**，直到：
- 你手动停止（Ctrl+C）
- 程序崩溃
- 服务器关闭

**自动处理**：
- ✅ 自动捕获新交易
- ✅ 自动存储数据
- ✅ 自动计算统计
- ✅ 自动触发预警
- ✅ 自动重连（如果断开）

---

## 📈 实时数据流

### 终端输出示例

```bash
🚀 LP Monitor 启动中...
✅ BSC 监控服务已启动

👀 开始监听事件...

💱 Swap: WBNB/BUSD | Price: 589.234567 | TX: 0x1234567...
💱 Swap: WBNB/BUSD | Price: 589.456789 | TX: 0xabcdef0...
➕ Add Liquidity: WBNB/BUSD | TX: 0x9876543...
💱 Swap: WBNB/BUSD | Price: 589.123456 | TX: 0xfedcba9...
🚨 大额交易预警: $15,234.56
💱 Swap: WBNB/BUSD | Price: 589.345678 | TX: 0x5678901...
```

**每条日志代表**：
- 一个真实的链上交易
- 已成功存入数据库
- 前端可以立即查看

---

## 🔄 数据更新频率

### 后端（监控服务）

| 事件类型 | 更新频率 | 延迟 |
|---------|---------|------|
| Swap 事件 | 实时 | 1-5秒 |
| Mint 事件 | 实时 | 1-5秒 |
| Burn 事件 | 实时 | 1-5秒 |
| 储备量更新 | 实时 | 1-5秒 |
| 小时统计 | 每笔交易后 | <1秒 |

### 前端（仪表盘）

| 数据类型 | 刷新频率 | 配置项 |
|---------|---------|--------|
| 统计概览 | 5秒 | `FRONTEND_REFRESH_INTERVAL` |
| 池子列表 | 5秒 | 同上 |
| 交易记录 | 5秒 | 同上 |
| 预警列表 | 5秒 | 同上 |

可以在 `.env` 中调整：
```bash
FRONTEND_REFRESH_INTERVAL=5000  # 5秒（默认）
```

---

## 🛡️ 容错和恢复

### 自动重连

监控服务具有自动重连机制：

```javascript
// WebSocket 配置
{
  reconnect: {
    auto: true,          // 自动重连
    delay: 5000,         // 5秒后重试
    maxAttempts: 10,     // 最多重试10次
  }
}
```

### 错误处理

每个事件监听器都有错误处理：

```javascript
contract.events.Swap()
  .on('data', handleEvent)
  .on('error', (error) => {
    console.error('事件错误:', error.message);
    // 不会导致程序崩溃
    // 会继续监听其他事件
  });
```

### 数据完整性

- ✅ 使用数据库事务
- ✅ 唯一约束防止重复
- ✅ 外键确保数据关联
- ✅ 索引加速查询

---

## 💾 数据存储策略

### 实时数据

所有交易实时写入 `transactions` 表：
```sql
INSERT INTO transactions (
    pool_id, tx_hash, event_type, 
    amount0_in, amount1_in, ...
)
```

### 聚合数据

每笔交易后更新 `hourly_stats`：
```sql
INSERT INTO hourly_stats (...)
ON CONFLICT (pool_id, hour_timestamp)
DO UPDATE SET
    volume_usd = hourly_stats.volume_usd + EXCLUDED.volume_usd,
    tx_count = hourly_stats.tx_count + 1
```

### 预警数据

大额交易自动创建预警：
```javascript
if (transaction.usd_value > LARGE_TRADE_THRESHOLD) {
    await createAlert({...});
}
```

---

## 🎛️ 监控控制

### 查看监控状态

**方法 1：终端输出**
```bash
✅ BSC 监控服务已启动
💱 Swap: WBNB/BUSD ...  # 有日志 = 正常运行
```

**方法 2：Web 仪表盘**
- 访问 http://localhost:3000
- 查看"监控服务状态"卡片
- 绿点 = 运行中，红点 = 已停止

**方法 3：数据库查询**
```bash
psql lp_monitor -c "SELECT * FROM monitor_status;"
```

### 停止监控

```bash
# 在运行 npm run monitor 的终端按
Ctrl + C
```

**优雅退出**：
- 断开 RPC 连接
- 关闭数据库连接
- 保存状态
- 清理资源

### 重启监控

```bash
# 停止后重新启动
npm run monitor
```

**自动恢复**：
- 从上次状态继续
- 不会丢失数据
- 不会重复记录

---

## 📊 性能监控

### 监控指标

监控服务会自动记录：
- 每小时交易数量
- 交易处理延迟
- 数据库写入性能
- 错误次数

### 慢查询告警

数据库层会自动记录慢查询：
```javascript
if (duration > 1000) {
    console.log('慢查询:', { text, duration, rows });
}
```

---

## 🔧 配置和优化

### 调整监控频率

虽然事件是实时的，但可以配置统计更新频率：

```bash
# .env
STATS_UPDATE_INTERVAL=60000  # 60秒更新一次统计
```

### 监控更多池子

```bash
# .env
BSC_POOL_ADDRESSES=池子1,池子2,池子3,池子4
```

**注意**：
- 每个池子独立监听
- 更多池子 = 更多事件
- 建议不超过 10 个池子

### 优化数据库

定期清理旧数据：
```sql
-- 删除 30 天前的交易记录（可选）
DELETE FROM transactions 
WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## 🎯 最佳实践

### 1. 持续运行

**生产环境推荐使用 PM2**：
```bash
npm install -g pm2
pm2 start scripts/start-monitors.js --name lp-monitor
pm2 save
pm2 startup
```

**优点**：
- ✅ 崩溃自动重启
- ✅ 开机自动启动
- ✅ 日志管理
- ✅ 监控资源

### 2. 监控健康检查

定期检查监控状态：
```bash
# 查看最近的交易
psql lp_monitor -c "
    SELECT COUNT(*) as count, 
           MAX(timestamp) as last_tx 
    FROM transactions 
    WHERE timestamp > NOW() - INTERVAL '5 minutes';
"
```

如果 5 分钟内没有交易，可能：
- 池子流动性低
- RPC 连接问题
- 监控服务停止

### 3. 备份数据

定期备份数据库：
```bash
pg_dump lp_monitor > backup_$(date +%Y%m%d).sql
```

---

## 🔍 调试和排查

### 查看实时日志

```bash
# 启动监控服务（显示详细日志）
npm run monitor

# 或使用 PM2
pm2 logs lp-monitor
```

### 检查事件监听

```bash
# 连接到数据库
psql lp_monitor

# 查看最近的事件
SELECT 
    event_type, 
    COUNT(*) as count,
    MAX(timestamp) as latest
FROM transactions
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

### 验证数据完整性

```bash
# 检查是否有遗漏
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as tx_count
FROM transactions
WHERE pool_id = 1
ORDER BY hour DESC
LIMIT 24;
```

---

## 📝 总结

### LP Monitor 持续监控的核心：

1. **事件驱动**：使用 Web3 事件监听器实时捕获
2. **自动运行**：启动后持续运行，无需人工干预
3. **实时存储**：每个事件立即保存到数据库
4. **容错设计**：自动重连、错误处理、数据完整性
5. **前端刷新**：5秒自动更新，展示最新数据

### 工作流程总结：

```
启动监控 → 连接节点 → 订阅事件 → 监听状态 ←┐
                                            │
实时捕获 ← 新交易发生 ← 持续运行 ← 处理事件 ←┘
    ↓
存入数据库 → 更新统计 → 触发预警 → 前端显示
```

---

## 🚀 快速开始持续监控

```bash
# 1. 启动监控服务（一个终端）
npm run monitor

# 2. 启动 Web 应用（另一个终端）
npm run dev

# 3. 访问仪表盘
open http://localhost:3000

# 4. 实时查看数据更新
# 监控服务会持续运行，自动捕获所有交易！
```

---

最后更新: 2024-11-20

**关键点**：监控服务启动后会**自动持续运行**，实时捕获所有链上事件，无需任何人工干预！✨


