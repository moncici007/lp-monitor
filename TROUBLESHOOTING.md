# 故障排除指南

## 常见问题和解决方案

### ❌ 问题 1: "role postgres does not exist"

**错误信息**:
```
error: role "postgres" does not exist
```

**原因**: macOS 上 PostgreSQL 的默认用户是系统用户名，不是 `postgres`

**解决方案**:

1. 查看当前用户名:
```bash
whoami
```

2. 更新 `.env` 文件中的 `DATABASE_URL`:
```bash
# 将 postgres 替换为你的用户名
DATABASE_URL=postgresql://你的用户名@localhost:5432/lp_monitor
```

3. 例如，如果你的用户名是 `bingo`:
```bash
DATABASE_URL=postgresql://bingo@localhost:5432/lp_monitor
```

---

### ❌ 问题 2: "database does not exist"

**解决方案**:
```bash
createdb lp_monitor
```

---

### ❌ 问题 3: "could not connect to server"

**原因**: PostgreSQL 服务未启动

**解决方案**:

**macOS (Homebrew)**:
```bash
brew services start postgresql@14
# 或
brew services start postgresql
```

**检查状态**:
```bash
brew services list
```

**Linux**:
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

### ❌ 问题 4: "trigger already exists"

**原因**: 数据库表已经存在

**解决方案**: 这实际上不是错误，表已经创建好了，可以直接使用

**如果需要重新创建数据库**:
```bash
# 删除并重新创建
dropdb lp_monitor
createdb lp_monitor
npm run db:setup
```

---

### ❌ 问题 5: RPC 连接超时

**错误信息**:
```
❌ BSC 连接失败: timeout
```

**解决方案**:

1. **更换 RPC 节点**:

在 `.env` 中尝试不同的节点:
```bash
# BSC 备用节点
BSC_RPC_URL=https://bsc-dataseed2.binance.org/
# 或
BSC_RPC_URL=https://bsc-dataseed3.binance.org/
```

2. **使用付费 RPC**:

注册 NodeReal (免费层):
- 访问: https://nodereal.io/
- 获取 API Key
- 更新配置:
```bash
BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY
```

---

### ❌ 问题 6: 没有看到交易数据

**可能原因**:

1. **监控服务未启动**
```bash
# 启动监控服务
npm run monitor
```

2. **池子流动性太低**

更换为高流动性池子:
```bash
# WBNB/BUSD (PancakeSwap 最活跃的池子)
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
```

3. **刚启动需要等待**

监控服务需要等待新的区块和交易，通常 1-5 分钟内会看到数据

---

### ❌ 问题 7: Web 应用无法访问

**检查清单**:

1. Next.js 服务是否运行:
```bash
npm run dev
```

2. 访问地址是否正确:
```
http://localhost:3000
```

3. 检查端口是否被占用:
```bash
lsof -i :3000
```

4. 更换端口:
```bash
PORT=3001 npm run dev
```

---

## 验证安装

### 1. 检查 PostgreSQL

```bash
# 检查服务状态
brew services list | grep postgresql

# 连接数据库
psql lp_monitor

# 在 psql 中执行
\dt  # 查看所有表
\q   # 退出
```

### 2. 检查数据库连接

```bash
# 测试连接
psql $DATABASE_URL -c "SELECT 1;"
```

### 3. 检查表结构

```bash
psql lp_monitor -c "\d pools"
psql lp_monitor -c "\d transactions"
psql lp_monitor -c "\d hourly_stats"
psql lp_monitor -c "\d large_trade_alerts"
psql lp_monitor -c "\d monitor_status"
```

### 4. 查看数据

```bash
# 查看池子
psql lp_monitor -c "SELECT * FROM pools;"

# 查看交易
psql lp_monitor -c "SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;"

# 查看监控状态
psql lp_monitor -c "SELECT * FROM monitor_status;"
```

---

## 完整的重启步骤

如果遇到各种问题，可以完全重置:

```bash
# 1. 停止所有服务
# Ctrl+C 停止 npm run dev
# Ctrl+C 停止 npm run monitor

# 2. 删除并重建数据库
dropdb lp_monitor
createdb lp_monitor
npm run db:setup

# 3. 检查 .env 配置
cat .env

# 4. 重新启动监控服务
npm run monitor

# 5. 在新终端启动 Web 应用
npm run dev
```

---

## 日志和调试

### 监控服务日志

监控服务会输出详细日志:
```
✅ 连接成功！当前区块: 34567890
📊 初始化池子: WBNB/BUSD
💱 Swap: WBNB/BUSD | Price: 1.234567 | TX: 0x1234567...
```

### API 错误日志

查看 Next.js 终端输出:
```
获取统计摘要失败: error: ...
```

### 数据库查询日志

慢查询会自动记录:
```
慢查询: { text: 'SELECT ...', duration: 1523, rows: 100 }
```

---

## 性能优化

### 1. 减少监控池子数量

如果性能不好，减少池子:
```bash
# 只监控 1-2 个池子
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
```

### 2. 增加刷新间隔

在 `.env` 中:
```bash
FRONTEND_REFRESH_INTERVAL=10000  # 改为 10 秒
```

### 3. 使用 HTTP 而非 WebSocket

如果 WebSocket 不稳定:
```bash
# 只使用 HTTP
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
# 注释掉 BSC_WSS_URL
```

---

## 获取帮助

如果以上方法都无法解决问题:

1. **检查日志**: 查看终端输出的完整错误信息
2. **查看文档**: 阅读 README.md 和 ARCHITECTURE.md
3. **验证配置**: 确保 .env 文件配置正确
4. **测试连接**: 分别测试数据库和 RPC 连接
5. **简化配置**: 从最简单的配置开始，只监控一个池子

---

## 系统要求

- Node.js 16+
- PostgreSQL 12+
- 稳定的网络连接
- 至少 2GB 可用内存

---

最后更新: 2024-11-20

