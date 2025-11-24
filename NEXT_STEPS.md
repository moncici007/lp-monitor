# ⏭️ 下一步操作清单

## ✅ 已完成的工作

- ✅ 修复 API endpoint 错误（404 问题已解决）
- ✅ 添加 PancakeSwap V2 和 V3 支持
- ✅ 更新事件处理器自动识别版本
- ✅ 创建诊断和配置工具
- ✅ 编写完整文档

## 🎯 接下来您需要做的 3 件事

### 步骤 1: 配置 Webhook URL (5分钟)

**选择方案**:

#### 方案 A: 使用 ngrok (推荐用于本地测试)

```bash
# 1. 安装 ngrok
brew install ngrok

# 2. 启动 ngrok
ngrok http 3001

# 3. 记下显示的 URL (例如: https://abc123.ngrok.io)
```

#### 方案 B: 使用公网服务器

如果您有公网服务器，可以直接使用服务器 URL。

---

### 步骤 2: 配置并启动 Stream (2分钟)

```bash
# 运行配置工具
node configure-stream.js

# 按提示操作：
# 1. 输入 Webhook URL (从步骤1获取)
# 2. 选择 'y' 启动 Stream
```

---

### 步骤 3: 启动监控系统 (1分钟)

```bash
# 在新终端窗口运行
npm run monitor:streams
```

期望看到：

```
🚀 LP Monitor - QuickNode Streams 版本
✅ Stream 验证成功
✅ Webhook 服务启动成功
✅ Factory 监听器已启动

等待事件...
```

---

### 步骤 4: 验证运行 (可选，1分钟)

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

## 📋 完整命令流程

### 终端 1: ngrok (如果使用)

```bash
ngrok http 3001
```

保持运行，记下 URL。

### 终端 2: 配置 Stream

```bash
cd /Users/bingo/crypto/lp-monitor
node configure-stream.js
# 输入 ngrok URL: https://xxxxx.ngrok.io/streams/webhook
# 选择启动: y
```

### 终端 3: 启动监控

```bash
cd /Users/bingo/crypto/lp-monitor
npm run monitor:streams
```

保持运行，查看日志。

### 终端 4: 测试 (可选)

```bash
cd /Users/bingo/crypto/lp-monitor
node test-webhook-data.js
```

---

## 🔍 验证成功的标志

### 1. Stream 配置成功

```bash
node verify-stream-config.js
```

输出：
```
✅ Stream 验证成功!
   状态: running
   Webhook: https://xxxxx.ngrok.io/streams/webhook
```

### 2. Webhook 接收数据

监控系统日志中会看到：

```
📨 收到 Streams Webhook 数据
   ✅ 匹配格式2：对象格式（JavaScript 过滤器）
   处理 4 个预过滤事件...
✅ 处理完成，共 4 个事件
```

### 3. 数据库有数据

```bash
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor

# 查询交易
SELECT COUNT(*) FROM transactions;

# 查询交易对
SELECT * FROM pairs LIMIT 5;
```

---

## 🚨 常见问题

### Q: ngrok URL 需要付费吗？
A: 免费版足够使用。免费版的限制：
- 随机域名
- 重启后域名会变（需要重新配置 Stream）
- 每分钟40个请求

如果需要固定域名，可以注册 ngrok 账号。

### Q: 不想用 ngrok，可以吗？
A: 可以，但需要：
1. 有公网服务器或固定IP
2. 配置端口转发/反向代理
3. 确保 3001 端口可被外网访问

### Q: Stream 可以暂停吗？
A: 可以，有两种方式：
```bash
# 方式1: 使用 streamManager
node -e "require('./src/monitor/streams/streamManager').pauseStream()"

# 方式2: 在 QuickNode Dashboard 手动暂停
```

### Q: 如何查看实时日志？
A: 监控系统运行时会自动显示日志。也可以：
```bash
# 只看错误
npm run monitor:streams 2>&1 | grep "❌"

# 只看成功
npm run monitor:streams 2>&1 | grep "✅"
```

---

## 📚 快速参考

| 需要 | 使用命令 |
|------|---------|
| 验证配置 | `node verify-stream-config.js` |
| 配置 Stream | `node configure-stream.js` |
| 列出 Streams | `./list-streams.sh` |
| 启动监控 | `npm run monitor:streams` |
| 测试 Webhook | `node test-webhook-data.js` |
| 启动前端 | `npm run dev` |

---

## 🎯 时间估算

| 任务 | 预计时间 |
|------|---------|
| 安装和启动 ngrok | 2 分钟 |
| 配置 Stream | 2 分钟 |
| 启动监控系统 | 1 分钟 |
| 验证和测试 | 2 分钟 |
| **总计** | **~7 分钟** |

---

## ✨ 完成后

系统运行后，您可以：

1. **查看 Web 界面**
   ```bash
   npm run dev
   # 访问 http://localhost:3000
   ```

2. **查看实时数据**
   - 交易对列表
   - 最新交易
   - 流动性变化
   - 异常告警

3. **分析数据**
   - 1小时交易量排名
   - 大额交易检测
   - 流动性趋势
   - 潜在套利机会

---

## 🚀 准备好了吗？

**从步骤 1 开始**: 选择 ngrok 或公网服务器，配置 Webhook URL。

**需要帮助？** 查看完整文档：
- `START_MONITORING.md` - 详细启动指南
- `TROUBLESHOOTING.md` - 故障排查
- `CHANGES_SUMMARY.md` - 更新说明

祝您监控顺利！🎉

