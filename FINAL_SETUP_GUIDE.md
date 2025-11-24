# 🎯 最终设置指南

## 📅 更新时间
2024年11月24日

---

## 🎊 完成的所有修复

✅ **修复 1**: QuickNode API Endpoint 错误 (404)  
✅ **修复 2**: V2/V3 事件签名更新  
✅ **修复 3**: Underflow 错误（健壮的数据解析）  
✅ **修复 4**: 缺少区块信息（从 Headers 提取）  
✅ **修复 5**: req.body 为空（手动解析）  
✅ **修复 6**: Next.js API 路由（备选方案）  
✅ **修复 7**: TCP 分包问题（原始 HTTP 服务器）  
✅ **修复 8**: 数据库约束错误（添加 UNIQUE 约束）  

---

## 🚀 立即开始（3 步）

### 第 1 步：修复数据库约束

```bash
# 在生产服务器上执行
psql --host 127.0.0.1 \
     --username postgres \
     --password lp-monitor \
     --dbname lp_monitor \
     < fix-unique-constraints.sql
```

**验证修复**:
```bash
psql --host 127.0.0.1 \
     --username postgres \
     --password lp-monitor \
     --dbname lp_monitor \
     -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%unique%hash%log%';"
```

**期望输出**:
```
              conname               |                   definition
------------------------------------+------------------------------------------------
 unique_transaction_hash_log_index  | UNIQUE (transaction_hash, log_index)
 unique_liquidity_event_hash_log_index | UNIQUE (transaction_hash, log_index)
```

---

### 第 2 步：启动 Webhook 服务器

**在生产服务器上**:

```bash
# 方式 1: 前台运行（用于测试）
npm run webhook:raw

# 方式 2: 后台运行（推荐生产环境）
nohup npm run webhook:raw > webhook.log 2>&1 &

# 方式 3: 使用 PM2（最佳实践）
pm2 start webhook-server-raw.js --name lp-monitor-webhook
pm2 logs lp-monitor-webhook  # 查看日志
pm2 save                      # 保存配置
pm2 startup                   # 开机自启
```

**检查服务器状态**:
```bash
# 健康检查
curl http://localhost:3000/health

# 应该返回
{"status":"ok","timestamp":"2024-11-24T..."}
```

---

### 第 3 步：配置 QuickNode Webhook

#### 本地开发（使用 ngrok）

```bash
# 在本地机器上
ngrok http 3000
```

获得 URL（例如）：`https://abc123.ngrok.io`

在 QuickNode Dashboard 配置：
- **Webhook URL**: `https://abc123.ngrok.io/webhook`

#### 生产环境

假设您的服务器公网 IP 是 `156.232.94.201`，端口是 `3000`：

在 QuickNode Dashboard 配置：
- **Webhook URL**: `http://156.232.94.201:3000/webhook`

**或者**如果您有域名（例如 `monitor.example.com`）：
- **Webhook URL**: `https://monitor.example.com/webhook`

---

## 📊 监控和日志

### 查看实时日志

```bash
# 如果使用 npm run 前台运行
# 日志会直接显示在终端

# 如果使用 nohup 后台运行
tail -f webhook.log

# 如果使用 PM2
pm2 logs lp-monitor-webhook

# 如果使用 systemd
journalctl -u webhook -f
```

### 日志示例

**正常运行**:
```
============================================================
🚀 原始 HTTP Webhook 服务器
============================================================
✅ 监听端口: 3000
✅ 健康检查: http://localhost:3000/health
✅ Webhook URL: http://localhost:3000/webhook
============================================================

📨 收到 Webhook 请求
   Headers: {...}
   📦 收到数据块 #1: 2048 字节
   📦 收到数据块 #2: 1075 字节
   ✅ 数据接收完成，共 2 个数据块，总大小: 3123 字节
   ✅ JSON 解析成功
   📊 事件数量: 4
   统计: {
     "eventTypes": {"swap": 2, "sync": 2},
     "matchedEvents": 4
   }
   处理 4 个预过滤事件...
   💱 Swap: 0x8665a78c... | 0x432ac5bc...
   🔄 Sync: 0x8665a78c... | 0x432ac5bc...
   💱 Swap: 0x8665a78c... | 0x389e7f4d...
   🔄 Sync: 0x8665a78c... | 0x389e7f4d...
   ✅ 处理完成，共 4 个事件
```

**看到多个数据块说明 TCP 分包正在正确处理！**

---

## 🔍 故障排查

### 问题 1: 数据库连接失败

**错误**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决**:
```bash
# 检查 PostgreSQL 是否运行
systemctl status postgresql

# 检查 .env 或 .env.local 中的 DATABASE_URL
cat .env.local | grep DATABASE_URL
```

---

### 问题 2: QuickNode 返回 400/500

**检查 QuickNode Dashboard**:
- Webhook URL 是否正确？
- 服务器是否可从外网访问？
- 端口是否开放？

**测试外网可访问性**:
```bash
# 在另一台机器上
curl http://156.232.94.201:3000/health
```

---

### 问题 3: 仍然有约束错误

**执行**:
```bash
# 检查约束是否存在
psql -U postgres -d lp_monitor -c "\d transactions"

# 查看约束详情
psql -U postgres -d lp_monitor -c "
SELECT 
    conname, 
    contype, 
    pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass;"
```

**如果缺少约束，重新执行**:
```bash
psql -U postgres -d lp_monitor -f fix-unique-constraints.sql
```

---

### 问题 4: 数据没有插入数据库

**检查日志**是否有 SQL 错误：
```bash
grep "❌" webhook.log
grep "ERROR" webhook.log
```

**手动查询数据库**:
```bash
psql -U postgres -d lp_monitor -c "
SELECT COUNT(*) as total, 
       MAX(created_at) as latest 
FROM transactions;"
```

---

## 📁 项目文件结构

```
lp-monitor/
├── webhook-server-raw.js           ★ 原始 HTTP 服务器（推荐）
├── fix-unique-constraints.sql      ★ 数据库迁移脚本
├── package.json
├── .env.local                      ★ 环境变量
├── src/
│   ├── db/
│   │   ├── client.js
│   │   ├── schema.sql
│   │   └── repositories/
│   │       ├── transactionRepository.js  ★ 已更新
│   │       └── liquidityRepository.js     ★ 已更新
│   ├── monitor/
│   │   └── streams/
│   │       ├── eventProcessor.js          ★ 已更新
│   │       ├── streamManager.js
│   │       └── webhookServer.js           (已弃用)
│   └── pages/
│       └── api/
│           └── streams/
│               └── webhook.js             (备选方案)
├── quicknode-stream-filter.js      ★ QuickNode 过滤器（V2）
├── quicknode-stream-filter-v2-and-v3.js  (V2+V3 统一)
└── 文档/
    ├── FINAL_SETUP_GUIDE.md        ★ 本文件
    ├── RAW_HTTP_SERVER.md
    ├── FIX_UNIQUE_CONSTRAINT.md
    ├── SYSTEM_OVERVIEW.md
    └── ...
```

---

## 🎯 核心技术决策

| 选择 | 原因 |
|------|------|
| 原始 HTTP 服务器 | 最可靠处理 TCP 分包 |
| `(transaction_hash, log_index)` | 支持同一交易多个事件 |
| 从 Headers 提取区块信息 | QuickNode 事件可能缺少字段 |
| 手动监听 `data` 事件 | 完全控制数据接收过程 |
| `DO NOTHING` on conflict | 安全忽略重复，避免错误 |

---

## ✅ 验证清单

执行以下命令验证系统正常运行：

```bash
# 1. 数据库约束检查
psql -U postgres -d lp_monitor -c "
SELECT COUNT(*) FROM pg_constraint 
WHERE conname IN (
  'unique_transaction_hash_log_index',
  'unique_liquidity_event_hash_log_index'
);" | grep "2"

# 2. 服务器健康检查
curl http://localhost:3000/health | grep '"status":"ok"'

# 3. 检查最近的交易数据
psql -U postgres -d lp_monitor -c "
SELECT COUNT(*) as total_transactions,
       MAX(timestamp) as latest_transaction
FROM transactions;"

# 4. 检查服务器进程
ps aux | grep webhook-server-raw

# 5. 检查端口监听
netstat -tuln | grep :3000
```

---

## 📞 快速命令参考

```bash
# 启动服务器
npm run webhook:raw

# 或后台运行
nohup npm run webhook:raw > webhook.log 2>&1 &

# 查看日志
tail -f webhook.log

# 健康检查
curl http://localhost:3000/health

# 查看数据库数据
psql -U postgres -d lp_monitor -c "SELECT * FROM transactions ORDER BY id DESC LIMIT 10;"

# 停止服务器
pkill -f webhook-server-raw

# 使用 PM2（推荐）
pm2 start webhook-server-raw.js --name lp-monitor
pm2 logs lp-monitor
pm2 restart lp-monitor
pm2 stop lp-monitor
```

---

## 🎊 成功指标

系统正常运行时，您应该看到：

1. ✅ 服务器启动成功（监听端口 3000）
2. ✅ QuickNode 成功推送数据到 Webhook
3. ✅ 日志显示接收到数据块（可能多个）
4. ✅ JSON 解析成功
5. ✅ 事件处理成功（Swap/Mint/Burn/Sync）
6. ✅ 数据成功插入数据库
7. ✅ 没有约束错误或 SQL 错误

---

## 🚀 下一步

系统运行后，您可以：

1. **访问前端界面**（如果有）
   ```bash
   npm run dev  # 在另一个终端
   # 访问 http://localhost:3000
   ```

2. **查询数据库分析**
   ```bash
   psql -U postgres -d lp_monitor
   ```

3. **添加更多交易对监控**
   - 通过 `streamManager.addPairToStream()` 添加
   - 或在 QuickNode Dashboard 手动添加地址

4. **设置告警**
   - 大额交易通知
   - 流动性异常通知
   - Rug Pull 风险提醒

---

## 📚 相关文档

- `RAW_HTTP_SERVER.md` - 原始 HTTP 服务器详解
- `FIX_UNIQUE_CONSTRAINT.md` - 数据库约束修复详解
- `SYSTEM_OVERVIEW.md` - 系统架构总览
- `STREAMS_SETUP.md` - QuickNode Streams 设置指南
- `TROUBLESHOOTING.md` - 故障排查指南

---

## 🎉 恭喜！

所有问题都已修复！现在系统应该能够：
- ✅ 可靠接收任意大小的 Webhook 数据
- ✅ 正确处理 TCP 分包
- ✅ 成功解析 V2 和 V3 事件
- ✅ 准确存储数据到 PostgreSQL
- ✅ 避免重复插入和约束错误

**开始监控吧！** 🚀

