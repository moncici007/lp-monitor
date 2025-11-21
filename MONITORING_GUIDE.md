# 持续监控快速指南 ⚡

## 🎯 一句话解释

**LP Monitor 启动后会自动持续监听区块链，实时捕获所有交易，无需任何人工操作！**

---

## 🚀 快速开始

### 第一步：启动监控服务

```bash
cd /Users/bingo/crypto/lp-monitor
npm run monitor
```

### 第二步：等待初始化

```
🚀 LP Monitor 启动中...
✅ 连接成功！当前区块: 68906387
📊 初始化池子: WBNB/BUSD
✅ 池子初始化完成
👀 开始监听事件...          # ← 这里开始持续监控
✅ BSC 监控服务已启动
```

### 第三步：保持运行

**监控服务会一直运行**，自动做这些事：

```
每当有新交易 → 自动捕获 → 自动存储 → 自动显示
```

---

## 📊 实时看到数据

### 方法 1：终端日志

保持监控服务运行，你会看到：

```bash
💱 Swap: WBNB/BUSD | Price: 589.234567 | TX: 0x1234567...
💱 Swap: WBNB/BUSD | Price: 589.456789 | TX: 0xabcdef0...
➕ Add Liquidity: WBNB/BUSD | TX: 0x9876543...
💱 Swap: WBNB/BUSD | Price: 589.123456 | TX: 0xfedcba9...
🚨 大额交易预警: $15,234.56
💱 Swap: WBNB/BUSD | Price: 589.345678 | TX: 0x5678901...
```

**每一行 = 一个真实的链上交易！**

### 方法 2：Web 仪表盘

1. 在另一个终端启动 Web 应用：
```bash
npm run dev
```

2. 打开浏览器：
```
http://localhost:3000
```

3. 看到实时数据：
   - 💧 池子列表
   - 📈 交易记录
   - 🚨 大额预警
   - 📊 统计数据

4. **页面每 5 秒自动刷新**，不需要手动刷新！

---

## ⏱️ 数据多快能看到？

### 链上交易 → 你的屏幕

```
用户在 PancakeSwap 交易
         ↓ (1-3秒)
LP Monitor 捕获事件
         ↓ (<1秒)
存入数据库
         ↓ (<1秒)
前端显示（自动刷新）
         ↓
总延迟: 2-5秒 ⚡
```

---

## 🔄 监控是如何"持续"的？

### 技术原理（简化版）

```javascript
// 监控服务启动后，注册事件监听器
contract.events.Swap()
  .on('data', (event) => {
    // 有新交易时，这个函数自动执行
    console.log('💱 新交易:', event);
    saveToDatabase(event);
  });

// 然后进入等待状态...
// 监听器会一直运行，直到你停止程序
```

### 类似于

就像你订阅了一个**实时通知**：
- 📱 有新邮件 → 手机自动推送
- 💱 有新交易 → 监控服务自动捕获

**完全自动，无需人工！**

---

## 📋 监控检查清单

### ✅ 监控正在运行的标志

1. **终端持续有输出**
   ```
   💱 Swap: WBNB/BUSD ...
   💱 Swap: WBNB/BUSD ...
   ```

2. **仪表盘有数据**
   - 打开 http://localhost:3000
   - 看到交易记录
   - "监控服务状态"显示绿点

3. **数据库有新记录**
   ```bash
   psql lp_monitor -c "SELECT COUNT(*) FROM transactions;"
   # 数字会持续增长
   ```

### ❌ 监控可能停止的标志

1. **终端没有新日志**（超过 5 分钟）
2. **仪表盘显示红点**
3. **数据库没有新记录**

---

## 🛠️ 常见操作

### 查看监控状态

```bash
# 检查最近的交易
psql lp_monitor -c "
    SELECT 
        COUNT(*) as total_transactions,
        MAX(timestamp) as last_transaction
    FROM transactions;
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
# 再次运行
npm run monitor

# 会自动从上次状态继续
# 不会丢失数据
```

---

## 🌐 监控多个池子

### 配置

在 `.env` 文件中：

```bash
# 单个池子
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16

# 多个池子（逗号分隔）
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16,0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE,0x0eD7e52944161450477ee417DE9Cd3a859b14fD0
```

### 效果

```
📊 初始化池子: WBNB/BUSD
✅ 池子初始化完成
📊 初始化池子: WBNB/USDT
✅ 池子初始化完成
📊 初始化池子: CAKE/WBNB
✅ 池子初始化完成

👀 开始监听事件...

💱 Swap: WBNB/BUSD ...
💱 Swap: WBNB/USDT ...
💱 Swap: CAKE/WBNB ...
```

**所有池子同时监控！**

---

## 💡 生产环境推荐

### 使用 PM2 保持后台运行

```bash
# 安装 PM2
npm install -g pm2

# 启动监控服务
pm2 start scripts/start-monitors.js --name lp-monitor

# 查看状态
pm2 status

# 查看日志
pm2 logs lp-monitor

# 停止
pm2 stop lp-monitor

# 重启
pm2 restart lp-monitor

# 设置开机自启
pm2 startup
pm2 save
```

**优点**：
- ✅ 后台运行，关闭终端也不会停止
- ✅ 崩溃自动重启
- ✅ 日志管理
- ✅ 资源监控

---

## 📊 实时数据流展示

### 可视化流程

```
┌─────────────────┐
│  PancakeSwap    │ 用户交易
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  区块链事件     │ Swap/Mint/Burn
└────────┬────────┘
         │
         ▼  (1-3秒)
┌─────────────────┐
│  LP Monitor     │ 自动捕获 ⚡
│  事件监听器     │
└────────┬────────┘
         │
         ▼  (<1秒)
┌─────────────────┐
│  PostgreSQL     │ 存储数据
└────────┬────────┘
         │
         ▼  (5秒刷新)
┌─────────────────┐
│  Web Dashboard  │ 实时显示
└─────────────────┘
         ↓
     你的屏幕 👀
```

---

## 🎯 典型使用场景

### 场景 1：日常监控

```bash
# 早上启动
npm run monitor

# 然后就可以：
- 关注其他工作
- 监控服务自动运行
- 需要时打开仪表盘查看
- 有大额交易会自动预警

# 晚上停止
Ctrl + C
```

### 场景 2: 长期运行

```bash
# 使用 PM2 启动
pm2 start scripts/start-monitors.js --name lp-monitor
pm2 save

# 然后：
- 服务一直在后台运行
- 即使重启服务器也会自动启动
- 任何时候可以查看数据
- 完全不用管！
```

### 场景 3：调试分析

```bash
# 启动监控
npm run monitor

# 观察终端输出
# 分析交易模式
# 发现异常立即响应

# 查看实时统计
psql lp_monitor -c "
    SELECT 
        event_type,
        COUNT(*) as count,
        AVG(CASE WHEN usd_value > 0 THEN usd_value END) as avg_value
    FROM transactions
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY event_type;
"
```

---

## 📈 数据积累

### 自动记录历史

监控服务会自动记录：

| 时间 | 累计数据 |
|------|---------|
| 1 小时 | ~100-500 笔交易 |
| 24 小时 | ~2,000-10,000 笔交易 |
| 1 周 | ~14,000-70,000 笔交易 |
| 1 月 | ~60,000-300,000 笔交易 |

**所有数据永久保存**（除非手动删除）

### 查看历史数据

```bash
# 今天的交易
psql lp_monitor -c "
    SELECT COUNT(*) 
    FROM transactions 
    WHERE timestamp > CURRENT_DATE;
"

# 本周的交易量
psql lp_monitor -c "
    SELECT SUM(volume_usd) 
    FROM hourly_stats 
    WHERE hour_timestamp > NOW() - INTERVAL '7 days';
"

# 最大的交易
psql lp_monitor -c "
    SELECT * 
    FROM transactions 
    ORDER BY usd_value DESC 
    LIMIT 10;
"
```

---

## ⚡ 性能说明

### 资源占用

**正常运行时**：
- CPU: <5%
- 内存: ~200-500MB
- 网络: 低（主要是 RPC 请求）
- 磁盘: 随数据增长

**监控 1 个池子**（高流动性）：
- 数据库增长: ~50-200MB/天
- RPC 请求: ~1,000-5,000/天

---

## 🆘 故障排除

### 问题：没有看到交易数据

**原因 1：池子流动性低**
- 解决：换一个高流动性池子
- 推荐：WBNB/BUSD

**原因 2：刚启动，需要等待**
- 解决：等待 1-5 分钟
- 新交易需要发生后才能捕获

**原因 3：RPC 连接问题**
- 解决：检查代理或更换 RPC 节点
- 运行：`./test-proxy.sh`

### 问题：终端没有输出

**检查**：
```bash
# 查看数据库连接
psql lp_monitor -c "SELECT 1;"

# 查看 RPC 连接
./test-proxy.sh

# 查看监控状态
psql lp_monitor -c "SELECT * FROM monitor_status;"
```

---

## 📚 相关文档

- **HOW_IT_WORKS.md** - 详细技术原理
- **QUICKSTART.md** - 完整安装指南
- **TROUBLESHOOTING.md** - 故障排除
- **PROXY_SETUP.md** - 代理配置
- **RPC_NODES.md** - RPC 节点选择

---

## 🎉 总结

### 持续监控就是这么简单：

```bash
# 1. 启动
npm run monitor

# 2. 等待初始化（10-30秒）

# 3. 看到 "开始监听事件"

# 4. 完成！✨
# 从现在开始，所有交易都会自动捕获
# 你什么都不用做！
```

### 核心要点：

- ✅ **自动运行**：启动后无需人工干预
- ✅ **实时捕获**：2-5 秒延迟
- ✅ **永久存储**：所有数据保存到数据库
- ✅ **容错设计**：自动重连，错误不会导致崩溃
- ✅ **随时查看**：Web 仪表盘自动刷新

---

最后更新: 2024-11-20

**现在就开始监控吧！** 🚀

```bash
npm run monitor
```


