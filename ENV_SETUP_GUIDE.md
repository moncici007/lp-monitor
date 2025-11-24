# 环境变量配置指南

## 🔑 必需配置

### 数据库（必需）

```bash
DATABASE_URL=postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor
```

### BSC RPC（必需）

```bash
BSC_RPC_URL=https://summer-solemn-pond.bsc.quiknode.pro/2d7c7a259ea0c4de731c3fad666f309c6fff111e/
```

### PancakeSwap 合约（必需）

```bash
PANCAKE_FACTORY_ADDRESS=0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E
```

## 🌊 Streams 配置（可选但推荐）

### 完整配置（推荐）

```bash
QUICKNODE_STREAM_ID=st_your_stream_id_here
QUICKNODE_API_KEY=QN_your_api_key_here
WEBHOOK_PORT=3001
```

### 不配置 Streams

如果暂时不使用 Streams，可以：

**选项1：注释掉（推荐）**
```bash
# QUICKNODE_STREAM_ID=
# QUICKNODE_API_KEY=
```

**选项2：使用传统监听模式**
```bash
# 使用传统 RPC 监听（有速率限制）
npm run monitor  # 而不是 npm run monitor:streams
```

## 📝 完整的 .env.local 示例

### 最小配置（不使用 Streams）

```bash
# Database
DATABASE_URL=postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor

# BSC RPC
BSC_RPC_URL=https://summer-solemn-pond.bsc.quiknode.pro/2d7c7a259ea0c4de731c3fad666f309c6fff111e/

# PancakeSwap V2 Contracts
PANCAKE_FACTORY_ADDRESS=0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E

# Monitoring Settings
LARGE_TRANSACTION_THRESHOLD_USD=10000
```

### 完整配置（推荐）

```bash
# Database
DATABASE_URL=postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor

# BSC RPC
BSC_RPC_URL=https://summer-solemn-pond.bsc.quiknode.pro/2d7c7a259ea0c4de731c3fad666f309c6fff111e/

# PancakeSwap V2 Contracts
PANCAKE_FACTORY_ADDRESS=0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E

# Monitoring Settings
LARGE_TRANSACTION_THRESHOLD_USD=10000

# QuickNode Streams (推荐配置以实现自动化)
QUICKNODE_STREAM_ID=st_abc123def456...
QUICKNODE_API_KEY=QN_xyz789ghi012...
WEBHOOK_PORT=3001
```

## 🚀 启动方式对比

### 方式1：使用 Streams（推荐）

```bash
# 需要配置 QUICKNODE_STREAM_ID 和 QUICKNODE_API_KEY
npm run monitor:streams
```

**优势**：
- ✅ 无 RPC 速率限制
- ✅ 可监控 100+ 交易对
- ✅ 自动化管理

### 方式2：传统 RPC 监听

```bash
# 不需要 Streams 配置
npm run monitor
```

**限制**：
- ⚠️ 受 15 请求/秒限制
- ⚠️ 最多监控 10-15 个交易对
- ⚠️ 容易触发速率限制

## 🔍 验证配置

### 检查 .env.local 文件

```bash
cat .env.local
```

### 测试数据库连接

```bash
psql "$DATABASE_URL" -c "SELECT NOW();"
```

### 测试 RPC 连接

```bash
curl -X POST "$BSC_RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 测试 Streams（如果配置了）

```bash
# 使用测试脚本
node test-webhook.js
```

## ❓ 常见问题

### Q: 必须配置 Streams 吗？

**A**: 不是必须的，但强烈推荐：
- 不配置：可以使用传统 RPC 监听（有限制）
- 配置后：无速率限制，可监控更多交易对

### Q: STREAM_ID 在哪里获取？

**A**: 
1. 登录 https://dashboard.quicknode.com/streams
2. 创建或查看已有的 Stream
3. Stream 详情页会显示 ID（格式：`st_xxx...`）

### Q: API_KEY 在哪里获取？

**A**:
1. 登录 https://dashboard.quicknode.com
2. 进入 **API Keys** 页面
3. 创建新的 API Key（确保包含 Streams 权限）

### Q: Webhook URL 如何配置？

**A**:
- **本地测试**: 使用 ngrok 暴露本地端口
  ```bash
  ngrok http 3001
  # 使用生成的 URL: https://xxxx.ngrok.io/streams/webhook
  ```
- **生产环境**: 使用服务器域名
  ```
  https://webhooks.yourdomain.com/streams/webhook
  ```

### Q: 配置后仍然 404？

**A**: 检查：
1. Stream ID 是否正确复制（完整的，包括 `st_` 前缀）
2. API Key 是否正确复制
3. Stream 是否处于 Active 状态
4. 是否有 Streams 权限

## 📚 相关文档

- [STREAMS_SETUP.md](./STREAMS_SETUP.md) - 详细的 Streams 配置指南
- [QUICKNODE_FILTER_GUIDE.md](./QUICKNODE_FILTER_GUIDE.md) - 过滤器配置
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 问题排查
- [INSTALL.md](./INSTALL.md) - 完整安装指南

---

**需要帮助？** 请查看相关文档或提供错误信息以获得更多支持。

