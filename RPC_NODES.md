# RPC 节点配置指南

## 🌐 为什么需要选择合适的 RPC 节点？

RPC 节点是你的应用与区块链通信的桥梁。选择稳定、快速的 RPC 节点对于监控服务至关重要。

---

## 🔧 BSC (Binance Smart Chain) RPC 节点

### ✅ 推荐节点（经过测试可用）

#### 1. PublicNode（推荐 ⭐⭐⭐⭐⭐）
```bash
BSC_RPC_URL=https://bsc-rpc.publicnode.com
```
- ✅ 免费
- ✅ 稳定性高
- ✅ 无需注册
- ✅ 速度快
- ✅ 已测试可用

#### 2. 1RPC
```bash
BSC_RPC_URL=https://1rpc.io/bnb
```
- ✅ 免费
- ✅ 稳定
- ✅ 无需注册
- ✅ 已测试可用

#### 3. Ankr（需要测试网络）
```bash
BSC_RPC_URL=https://rpc.ankr.com/bsc
```
- ✅ 免费
- ⚠️ 部分地区可能不稳定
- ✅ 无需注册

### 🚫 可能不可用的节点

#### Binance 官方节点（中国大陆可能无法访问）
```bash
https://bsc-dataseed1.binance.org/
https://bsc-dataseed2.binance.org/
https://bsc-dataseed3.binance.org/
https://bsc-dataseed4.binance.org/
```

这些节点在某些地区可能被限制访问。

### 💰 付费节点（生产环境推荐）

#### 1. NodeReal（推荐）
- 🌐 网站: https://nodereal.io/
- 💵 免费层: 每天 300M 请求
- ✅ 支持 WebSocket
- ✅ 稳定性极高

配置示例：
```bash
BSC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY
```

#### 2. QuickNode
- 🌐 网站: https://quicknode.com/
- 💵 免费试用
- ✅ 支持 WebSocket
- ✅ 全球节点

#### 3. Chainstack
- 🌐 网站: https://chainstack.com/
- 💵 免费层: 每月 300万 请求
- ✅ 企业级稳定性

---

## 🟣 Solana RPC 节点

### ✅ 推荐节点

#### 1. Helius（推荐 ⭐⭐⭐⭐⭐）
```bash
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```
- 💵 免费层: 每天 10万 请求
- ✅ 专为 Solana 优化
- ✅ 速度快
- 🌐 注册: https://helius.dev/

#### 2. QuickNode
```bash
SOLANA_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
```
- 💵 免费试用
- ✅ 稳定性高

#### 3. Solana 官方（限流严格）
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```
- ✅ 免费
- ⚠️ 速率限制严格
- ⚠️ 仅适合测试

#### 4. PublicNode
```bash
SOLANA_RPC_URL=https://solana-rpc.publicnode.com
```
- ✅ 免费
- ✅ 无需注册

---

## 🔧 测试 RPC 节点

### 测试 BSC 节点
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://bsc-rpc.publicnode.com

# 成功响应示例:
# {"jsonrpc":"2.0","id":1,"result":"0x41b6bf2"}
```

### 测试 Solana 节点
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
  https://api.mainnet-beta.solana.com

# 成功响应示例:
# {"jsonrpc":"2.0","result":{"solana-core":"1.18.11"},"id":1}
```

---

## 📝 推荐配置方案

### 方案 1: 完全免费（适合开发测试）

```bash
# .env
BSC_RPC_URL=https://bsc-rpc.publicnode.com
SOLANA_RPC_URL=https://solana-rpc.publicnode.com
```

**优点**:
- ✅ 完全免费
- ✅ 无需注册
- ✅ 开箱即用

**缺点**:
- ⚠️ 可能有速率限制
- ⚠️ 不支持 WebSocket（实时性稍差）

---

### 方案 2: 混合免费（推荐 ⭐⭐⭐⭐⭐）

```bash
# .env
# BSC 使用免费节点
BSC_RPC_URL=https://bsc-rpc.publicnode.com

# Solana 使用 Helius 免费层
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

**优点**:
- ✅ BSC 免费无限制
- ✅ Solana 有更高的速率限制
- ✅ 适合中小规模监控

**缺点**:
- ⚠️ 需要注册 Helius 账号

**注册步骤**:
1. 访问 https://helius.dev/
2. 注册免费账号
3. 创建 API Key
4. 复制到 .env

---

### 方案 3: 付费节点（生产环境）

```bash
# .env
# 使用 NodeReal 付费节点
BSC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# 使用 Helius 付费计划
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
SOLANA_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

**优点**:
- ✅ 极高稳定性
- ✅ WebSocket 实时推送
- ✅ 无速率限制
- ✅ 技术支持

**成本**:
- NodeReal: $49/月起
- Helius: $99/月起

---

## 🚀 快速切换节点

如果当前节点不可用，快速切换：

```bash
cd /Users/bingo/crypto/lp-monitor

# 编辑 .env 文件
nano .env

# 或使用命令直接替换
sed -i '' 's|BSC_RPC_URL=.*|BSC_RPC_URL=https://bsc-rpc.publicnode.com|' .env

# 重启监控服务
# Ctrl+C 停止，然后重新运行:
npm run monitor
```

---

## 🔍 节点性能对比

| 节点 | 免费 | 速度 | 稳定性 | WebSocket | 推荐度 |
|------|------|------|--------|-----------|--------|
| PublicNode (BSC) | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ |
| 1RPC (BSC) | ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ❌ | ⭐⭐⭐⭐ |
| NodeReal (BSC) | 💵 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |
| Helius (Solana) | 💵 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |
| PublicNode (Solana) | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐ |
| Solana 官方 | ✅ | ⭐⭐ | ⭐⭐ | ❌ | ⭐⭐ |

---

## ⚠️ 常见问题

### 1. 为什么 Binance 官方节点连接失败？

**原因**: 某些地区网络限制或节点维护

**解决方案**: 使用第三方节点（PublicNode、1RPC 等）

### 2. HTTP vs WebSocket 有什么区别？

**HTTP**:
- ✅ 简单易用
- ⚠️ 需要轮询，实时性稍差
- ✅ 适合免费节点

**WebSocket**:
- ✅ 实时推送，延迟低
- ✅ 不需要轮询，省资源
- ⚠️ 需要付费节点

### 3. 如何监控节点状态？

查看监控服务输出:
```bash
✅ 连接成功！当前区块: 34567890  # 正常
❌ BSC 连接失败: timeout         # 异常
```

### 4. 节点速率限制

大多数免费节点有速率限制：
- PublicNode: 合理使用无限制
- Binance 官方: 约 10 请求/秒
- Helius 免费: 100,000 请求/天

**优化建议**:
- 只监控必要的池子（2-5个）
- 使用 HTTP 而非频繁轮询
- 考虑付费节点

---

## 📊 实时监控节点健康度

创建一个测试脚本：

```bash
#!/bin/bash
# test-rpc.sh

echo "测试 BSC RPC..."
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $BSC_RPC_URL | jq '.'

echo ""
echo "测试 Solana RPC..."
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
  $SOLANA_RPC_URL | jq '.'
```

运行：
```bash
source .env
bash test-rpc.sh
```

---

## 🎯 最佳实践

1. **开发环境**: 使用免费节点（PublicNode）
2. **测试环境**: 使用免费节点 + 监控
3. **生产环境**: 使用付费节点 + 备用节点
4. **定期检查**: 监控节点可用性
5. **准备备用**: 配置多个 RPC URL

---

## 💡 小技巧

### 环境变量支持多个节点（待实现）

```bash
BSC_RPC_URLS=https://bsc-rpc.publicnode.com,https://1rpc.io/bnb
```

程序自动切换到可用节点。

### 使用代理（如果网络受限）

```bash
# 使用 HTTP 代理
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
npm run monitor
```

---

最后更新: 2024-11-20

**当前推荐配置**:
```bash
BSC_RPC_URL=https://bsc-rpc.publicnode.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

