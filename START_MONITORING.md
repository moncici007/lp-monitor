# 🚀 开始监控 - 完整指南

## ✅ 当前状态

根据您的配置情况：

- ✅ QuickNode Stream 已创建
- ✅ Stream ID 已配置: `382f116e-dad2-4595-a51b-4b571f7e7c50`
- ✅ API Key 已配置
- ✅ API endpoint 已修复
- ✅ 系统已支持 V2 和 V3
- ✅ 已收到实际的 Webhook 数据
- ⚠️  Stream 状态: **paused** (需要启动)
- ⚠️  Webhook: 需要配置公网 URL

---

## 🎯 两种运行模式

### 模式 1: 完整模式 (包含 Streams)

实时监控新创建的交易对和已有交易对的活动。

**要求**:
- PostgreSQL 数据库运行中
- QuickNode Stream 已配置并启动
- Webhook URL 已设置（ngrok 或公网服务器）

**启动方式**:
```bash
npm run monitor:streams
```

### 模式 2: 仅前端模式

查看已存储的数据，不实时监控。

**要求**:
- PostgreSQL 数据库运行中

**启动方式**:
```bash
npm run dev
```

访问: http://localhost:3000

---

## 📋 完整启动流程

### 步骤 1: 准备数据库

```bash
# 1. 启动 PostgreSQL (如果还没启动)
# macOS:
brew services start postgresql

# 或直接启动:
pg_ctl -D /usr/local/var/postgres start

# 2. 创建数据库和表
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor -f src/db/schema.sql

# 3. 验证连接
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor -c "\dt"
```

### 步骤 2: 配置 Webhook

#### 选项 A: 使用 ngrok (本地开发)

```bash
# 1. 安装 ngrok (如果还没安装)
brew install ngrok

# 2. 启动 ngrok
ngrok http 3001

# 会显示类似这样的输出:
# Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

#### 选项 B: 使用公网服务器

如果您有公网服务器，直接使用服务器的 URL。

### 步骤 3: 配置 Stream

```bash
# 运行配置工具
node configure-stream.js
```

当提示输入 Webhook URL 时：
- **ngrok**: 输入 `https://abc123.ngrok.io/streams/webhook`
- **公网服务器**: 输入 `https://your-domain.com/streams/webhook`

然后选择启动 Stream。

### 步骤 4: 启动监控系统

```bash
# 启动完整的监控系统
npm run monitor:streams
```

您应该看到类似这样的输出：

```
🚀 LP Monitor - QuickNode Streams 版本

📡 初始化 QuickNode Stream...
✅ Stream 验证成功
   ID: 382f116e-dad2-4595-a51b-4b571f7e7c50
   状态: running

🎧 启动 Webhook 服务器...
✅ Webhook 服务启动成功
   端口: 3001
   路径: /streams/webhook

🏭 监听 Factory 合约...
✅ Factory 监听器已启动
```

### 步骤 5: 测试 Webhook

在另一个终端运行测试：

```bash
node test-webhook-data.js
```

应该看到：

```
✅ Webhook 服务正在运行
✅ Webhook 处理成功!
```

---

## 🧪 验证和测试

### 1. 验证 Stream 配置

```bash
node verify-stream-config.js
```

期望输出:
```
✅ Stream 验证成功!
Stream 详情:
------------------------------------------------------------
ID: 382f116e-dad2-4595-a51b-4b571f7e7c50
名称: lp-monitor
状态: running
```

### 2. 测试 Webhook 接收

```bash
# 测试健康检查
curl http://localhost:3001/health

# 测试实际数据处理
node test-webhook-data.js
```

### 3. 查看日志

监控系统会输出详细日志：

```
📨 收到 Streams Webhook 数据
   ✅ 匹配格式2：对象格式（JavaScript 过滤器）
   统计: {
     "eventTypes": {
       "swap": 2,
       "sync": 2
     },
     "matchedEvents": 4
   }
   处理 4 个预过滤事件...
✅ 处理完成，共 4 个事件
```

### 4. 检查数据库

```bash
# 连接数据库
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor

# 查看交易对
SELECT * FROM pairs;

# 查看最近的交易
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;

# 查看流动性事件
SELECT * FROM liquidity_events ORDER BY timestamp DESC LIMIT 10;
```

---

## 📊 查看前端界面

```bash
# 启动 Next.js 开发服务器
npm run dev
```

访问: http://localhost:3000

界面包括：
- 📊 仪表盘 - 总览统计
- 📋 交易对列表 - 所有监控的交易对
- 🔍 交易对详情 - 单个交易对的详细信息
- 🚨 告警列表 - 异常活动告警

---

## 🔧 故障排查

### 问题 1: Webhook 收不到数据

**检查清单**:
1. Stream 状态是否为 `running`
   ```bash
   node verify-stream-config.js
   ```

2. Webhook URL 是否可公网访问
   ```bash
   # 如果使用 ngrok
   curl https://your-ngrok-url.ngrok.io/health
   ```

3. Webhook 服务是否启动
   ```bash
   curl http://localhost:3001/health
   ```

4. 在 QuickNode Dashboard 查看 Stream 日志

### 问题 2: 数据库连接失败

```bash
# 检查 PostgreSQL 服务
pg_isready -h 127.0.0.1 -p 5432

# 检查数据库是否存在
psql -l | grep lp_monitor

# 测试连接
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor -c "SELECT 1;"
```

### 问题 3: Stream 404 错误

✅ **已解决** - API endpoint 已修复

如果仍然出现，检查：
```bash
# 列出所有 Streams
./list-streams.sh

# 确认 Stream ID 正确
cat .env | grep QUICKNODE_STREAM_ID
```

### 问题 4: 事件不被处理

检查事件签名是否匹配：

```bash
# 查看实际收到的数据
# 日志中会显示: "事件签名: 0x..."

# V2 Swap: 0xc42079f9...
# V3 Swap: 0xd78ad95f...
# 系统现在同时支持两者
```

---

## 📚 参考文档

| 文档 | 说明 |
|------|------|
| `QUICK_START.md` | 快速开始 |
| `STREAMS_SETUP.md` | Streams 详细配置 |
| `SYSTEM_OVERVIEW.md` | 系统架构 |
| `WEBHOOK_DATA_FORMAT.md` | Webhook 数据格式 |
| `V3_SUPPORT.md` | V3 支持说明 |
| `TROUBLESHOOTING.md` | 故障排查 |

---

## 🛠️ 可用命令

```bash
# 配置和验证
node verify-stream-config.js    # 验证 Stream 配置
node configure-stream.js         # 配置 Webhook 和启动 Stream
./list-streams.sh                # 列出所有 Streams

# 测试
node test-webhook-data.js        # 测试实际 Webhook 数据处理
node test-webhook.js             # 发送测试数据

# 运行
npm run monitor:streams          # 启动完整监控系统
npm run dev                      # 启动前端界面

# 数据库
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor
```

---

## 💡 下一步

1. ✅ **已完成**: 配置 Stream 和 API
2. ✅ **已完成**: 修复 API endpoint
3. ✅ **已完成**: 支持 V2 和 V3
4. ⏭️ **待完成**: 配置 Webhook URL
5. ⏭️ **待完成**: 启动 Stream
6. ⏭️ **待完成**: 启动监控系统
7. ⏭️ **待完成**: 验证数据接收

---

## 🎉 完成后

系统运行后，您将能够：

- ✅ 实时监控 BSC 链上新创建的 PancakeSwap V2/V3 交易对
- ✅ 追踪交易量、大额交易
- ✅ 监控流动性变化
- ✅ 检测潜在的套利机会
- ✅ 识别异常活动（如 rug pull）
- ✅ 在 Web 界面查看所有数据

祝您监控顺利！🚀

