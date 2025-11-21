# 🚀 快速启动指南

## ✅ 配置已完成

你的 LP Monitor 已经配置完成，使用以下配置：

### 数据库
```
PostgreSQL @ 127.0.0.1:5432
数据库名: lp_monitor
用户: postgres
```

### 区块链连接
```
✅ BSC WebSocket: NodeReal
✅ 代理: http://127.0.0.1:1087
✅ 监控池子: WBNB/BUSD (PancakeSwap)
```

---

## 🚀 启动步骤

### 第一步：确保数据库运行

```bash
# 检查 PostgreSQL 是否运行
psql -U postgres -d lp_monitor -c "SELECT 'OK' as status;"

# 如果数据库不存在，运行：
npm run db:setup
```

---

### 第二步：启动监控服务

打开一个终端窗口：

```bash
cd /Users/bingo/crypto/lp-monitor
npm run monitor
```

**预期输出**：

```
🚀 LP Monitor 启动中...
============================================================
🔷 BSC 监控
============================================================
🔗 初始化 BSC 监控服务...
✅ 使用 WebSocket 连接           ⬅️ 关键！
✅ 连接成功！当前区块: 68969787
📊 初始化池子: 0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
✅ 池子初始化完成: WBNB/BUSD
👀 开始监听事件...
✅ 已注册事件监听: WBNB/BUSD      ⬅️ 关键！
✅ BSC 监控服务已启动
============================================================
✅ 所有监控服务已启动
============================================================

💡 提示: 按 Ctrl+C 停止监控

# 等待 1-5 分钟后，你会开始看到交易：
💱 Swap: WBNB/BUSD | Price: 589.234567 | TX: 0x1234567...
💱 Swap: WBNB/BUSD | Price: 589.456789 | TX: 0xabcdef0...
➕ Add Liquidity: WBNB/BUSD | TX: 0x9876543...
```

---

### 第三步：启动 Web 应用

打开**另一个**终端窗口：

```bash
cd /Users/bingo/crypto/lp-monitor
npm run dev
```

**预期输出**：

```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

### 第四步：访问仪表盘

打开浏览器访问：

```
http://localhost:3000
```

你应该看到：
- 📊 统计概览（池子数、交易量等）
- 💧 流动性池列表
- 📈 最近交易记录
- 🚨 大额交易预警

**页面每 5 秒自动刷新！**

---

## 🔍 验证运行状态

### 方法 1: 查看终端输出

监控服务的终端应该持续有输出：
```bash
💱 Swap: WBNB/BUSD | Price: 589.234567 | TX: 0x1234567...
💱 Swap: WBNB/BUSD | Price: 589.456789 | TX: 0xabcdef0...
```

**如果超过 5 分钟没有输出**：
- ⚠️ 池子可能交易不活跃（正常）
- ⚠️ 等待时间较长（耐心等待）
- ⚠️ 检查是否有错误信息

---

### 方法 2: 查看数据库

```bash
# 检查是否有交易记录
psql -U postgres -d lp_monitor -c "
    SELECT 
        COUNT(*) as total_transactions,
        MAX(timestamp) as last_transaction
    FROM transactions;
"

# 应该看到数字逐渐增加
```

---

### 方法 3: 查看 Web 仪表盘

访问 http://localhost:3000，应该看到：
- ✅ "监控服务状态"显示绿点
- ✅ 有池子数据
- ✅ 有交易记录（等待 1-5 分钟）

---

## ⚠️ 常见问题

### 问题 1: 数据库连接失败

```
error: role "postgres" does not exist
```

**解决方案**：

检查数据库用户名和密码：
```bash
# 测试连接
psql -U postgres -d lp_monitor

# 如果失败，可能需要修改 .env 中的 DATABASE_URL
# 使用你实际的用户名和密码
```

---

### 问题 2: WebSocket 连接失败

```
❌ BSC 连接失败: Connection timeout
```

**解决方案**：

1. 检查网络连接
2. 验证 API Key 是否正确
3. 尝试直接测试：

```bash
node test-websocket.js
```

4. 如果还是失败，尝试备用节点：

```bash
# 编辑 .env
BSC_WSS_URL=wss://rpc.ankr.com/bsc/ws
```

---

### 问题 3: 长时间没有交易数据

**可能原因**：
1. 池子流动性低，交易不频繁
2. 刚启动，需要等待新交易
3. 网络延迟

**解决方案**：
1. **耐心等待** 1-5 分钟
2. 检查池子是否活跃：访问 https://pancakeswap.finance/info/pairs/0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
3. 更换为更活跃的池子（查看 POOL_ADDRESSES.md）

---

### 问题 4: 事件监听不工作

```
❌ 合约不支持事件监听
```

**解决方案**：

确保使用 WebSocket：
```bash
# 检查配置
cat .env | grep BSC_WSS_URL

# 应该看到：
BSC_WSS_URL=wss://...
```

如果没有，添加 WebSocket URL 并重启。

---

## 📊 监控数据说明

### 交易类型

| 符号 | 类型 | 说明 |
|------|------|------|
| 💱 | Swap | 代币交换 |
| ➕ | Mint | 添加流动性 |
| ➖ | Burn | 移除流动性 |
| 🚨 | Alert | 大额交易预警 |

### 数据刷新频率

- **后端监控**: 实时（1-3 秒延迟）
- **前端仪表盘**: 每 5 秒自动刷新
- **数据库**: 即时写入

---

## 🛠️ 实用命令

### 查看最近的交易
```bash
psql -U postgres -d lp_monitor -c "
    SELECT 
        event_type,
        timestamp,
        tx_hash
    FROM transactions
    ORDER BY timestamp DESC
    LIMIT 10;
"
```

### 查看今天的交易量
```bash
psql -U postgres -d lp_monitor -c "
    SELECT 
        COUNT(*) as tx_count,
        event_type
    FROM transactions
    WHERE timestamp > CURRENT_DATE
    GROUP BY event_type;
"
```

### 查看监控状态
```bash
psql -U postgres -d lp_monitor -c "
    SELECT * FROM monitor_status;
"
```

### 停止监控
```bash
# 在运行监控的终端按
Ctrl + C

# 你会看到：
⏹️  停止 BSC 监控服务...
✅ BSC 监控服务已停止
```

### 重启监控
```bash
npm run monitor
```

---

## 🎯 下一步

### 1. 等待数据积累

让监控服务运行几小时，积累足够的数据：
- 1 小时 ≈ 100-500 笔交易
- 24 小时 ≈ 2,000-10,000 笔交易

### 2. 分析数据

使用 Web 仪表盘或直接查询数据库：
```bash
# 查看交易量统计
psql -U postgres -d lp_monitor -c "
    SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as tx_count
    FROM transactions
    GROUP BY hour
    ORDER BY hour DESC
    LIMIT 24;
"
```

### 3. 添加更多池子

编辑 `.env` 文件：
```bash
# 添加更多池子地址（逗号分隔）
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16,0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE
```

重启监控服务生效。

### 4. 设置预警

调整预警阈值：
```bash
# 在 .env 中修改
LARGE_TRADE_THRESHOLD_USD=5000  # 5000 美元以上触发预警
```

---

## 💡 提示

### 性能优化
- 监控 2-5 个池子最佳
- 定期清理旧数据（可选）
- 使用 PM2 保持后台运行

### 数据备份
```bash
# 定期备份数据库
pg_dump -U postgres lp_monitor > backup_$(date +%Y%m%d).sql
```

### 长期运行
```bash
# 使用 PM2
npm install -g pm2
pm2 start scripts/start-monitors.js --name lp-monitor
pm2 startup
pm2 save
```

---

## 📚 相关文档

- **HOW_IT_WORKS.md** - 工作原理详解
- **MONITORING_GUIDE.md** - 监控指南
- **EVENT_LISTENING_ISSUE.md** - 事件监听问题
- **PROXY_SETUP.md** - 代理配置
- **TROUBLESHOOTING.md** - 故障排除

---

## 🎉 成功标志

如果你看到以下内容，说明一切正常：

✅ 监控服务启动无错误
✅ 终端持续有交易日志输出
✅ Web 仪表盘能访问
✅ 数据库有交易记录
✅ 页面显示实时数据

**恭喜！你的 LP Monitor 已经成功运行！** 🎊

---

最后更新: 2024-11-21

**当前配置**: NodeReal WebSocket + WBNB/BUSD 池子

