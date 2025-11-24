# 🚀 快速启动指南

## ✅ 已完成
- ✅ QuickNode Stream 已创建
- ✅ API Key 已配置
- ✅ Stream ID 已配置
- ✅ API endpoint 已修复

## 📋 下一步操作

### 方案A: 本地开发 (使用 ngrok)

如果您想在本地测试，需要暴露本地 webhook 端口：

1. **安装 ngrok** (如果还没有):
   ```bash
   # macOS
   brew install ngrok
   
   # 或直接下载
   # https://ngrok.com/download
   ```

2. **启动 ngrok**:
   ```bash
   ngrok http 3001
   ```
   
   会得到一个 URL，例如: `https://abc123.ngrok.io`

3. **配置 Stream Webhook**:
   ```bash
   node configure-stream.js
   ```
   
   当提示输入 Webhook URL 时，输入:
   ```
   https://abc123.ngrok.io/streams/webhook
   ```

4. **启动监控系统**:
   ```bash
   npm run monitor:streams
   ```

### 方案B: 生产环境部署

如果您有公网服务器：

1. **配置 Stream Webhook**:
   ```bash
   node configure-stream.js
   ```
   
   输入您的服务器 URL:
   ```
   https://your-domain.com/streams/webhook
   ```

2. **启动监控系统**:
   ```bash
   npm run monitor:streams
   ```

### 方案C: 暂时跳过 Webhook (测试其他功能)

如果暂时不配置 Webhook，可以先测试其他功能：

```bash
# 启动 Next.js 开发服务器
npm run dev

# 访问 http://localhost:3000 查看前端界面
```

## 🔍 验证配置

随时可以运行以下命令验证配置：

```bash
# 验证 Stream 配置
node verify-stream-config.js

# 列出所有 Streams
./list-streams.sh

# 配置 Webhook 和启动 Stream
node configure-stream.js
```

## 📖 相关文档

- `STREAMS_SETUP.md` - 详细的 Streams 设置指南
- `SYSTEM_OVERVIEW.md` - 系统架构总览
- `TROUBLESHOOTING.md` - 故障排查指南
- `HOW_TO_GET_STREAM_ID.md` - 如何获取 Stream ID

## 🐛 故障排查

### Stream 返回 404
✅ **已解决** - API endpoint 已修复

### Webhook 收不到数据
1. 确认 Stream 状态为 `running`
2. 确认 Webhook URL 可公网访问
3. 检查 Webhook 服务是否启动 (端口 3001)
4. 查看 QuickNode Dashboard 的 Stream 日志

### 数据库连接失败
检查 PostgreSQL 是否启动:
```bash
# 检查服务
pg_isready -h 127.0.0.1 -p 5432

# 测试连接
psql postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor
```

## 💡 推荐流程

对于首次使用，推荐按以下顺序操作：

1. ✅ 配置环境变量 (已完成)
2. 🔄 设置 PostgreSQL 数据库
3. 🔄 配置 Webhook (使用 ngrok 或公网服务器)
4. 🔄 启动 Stream
5. 🔄 运行监控系统
6. 🔄 测试数据接收

## 需要帮助?

如果遇到问题，请查看：
- 运行 `node verify-stream-config.js` 诊断配置
- 查看 `TROUBLESHOOTING.md` 
- 检查系统日志输出

