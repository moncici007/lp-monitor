# 代理配置指南 🌐

如果你在中国大陆或其他需要使用代理访问国外服务的地区，本指南将帮助你配置 LP Monitor 使用代理。

---

## 🎯 支持的代理类型

- ✅ HTTP 代理
- ✅ HTTPS 代理  
- ✅ SOCKS5 代理（需要额外配置）

---

## ⚙️ 配置方法

### 方法 1: 在 .env 文件中配置（推荐 ⭐⭐⭐⭐⭐）

在项目根目录的 `.env` 文件中添加：

```bash
# HTTP 代理配置
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087
```

**常见代理软件的默认端口**:
- Clash: `7890`
- V2rayU: `1087`
- Shadowsocks: `1080`
- Surge: `6152`

根据你使用的代理软件调整端口号。

---

### 方法 2: 使用环境变量

在启动监控服务时临时设置：

```bash
# macOS/Linux
export HTTP_PROXY=http://127.0.0.1:1087
export HTTPS_PROXY=http://127.0.0.1:1087
npm run monitor
```

```bash
# Windows (PowerShell)
$env:HTTP_PROXY="http://127.0.0.1:1087"
$env:HTTPS_PROXY="http://127.0.0.1:1087"
npm run monitor
```

---

### 方法 3: 在启动命令中直接指定

```bash
HTTP_PROXY=http://127.0.0.1:1087 HTTPS_PROXY=http://127.0.0.1:1087 npm run monitor
```

---

## 🔍 验证代理配置

### 1. 检查代理是否启用

启动监控服务时，应该看到：

```bash
🔗 初始化 BSC 监控服务...
🌐 使用代理: http://127.0.0.1:1087    # ✅ 代理已启用
✅ 使用 HTTP 连接
✅ 连接成功！当前区块: 34567890
```

### 2. 测试代理连接

使用 curl 测试代理：

```bash
# 测试 BSC RPC（通过代理）
curl -x http://127.0.0.1:1087 \
  -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://bsc-dataseed1.binance.org/

# 应该返回:
# {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

---

## 📝 完整的 .env 配置示例

```bash
# 数据库配置
DATABASE_URL=postgresql://bingo@localhost:5432/lp_monitor

# BSC 配置
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
# 或使用免费的第三方节点（如果代理不稳定）
# BSC_RPC_URL=https://bsc-rpc.publicnode.com

# Solana 配置
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# 代理配置（根据你的代理软件端口修改）
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087

# 要监控的池子地址
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2

# 预警阈值
LARGE_TRADE_THRESHOLD_USD=10000
LARGE_LIQUIDITY_THRESHOLD_USD=50000

# 更新间隔
STATS_UPDATE_INTERVAL=60000
FRONTEND_REFRESH_INTERVAL=5000
```

---

## 🚀 推荐配置方案

### 使用代理 + Binance 官方节点

```bash
# .env
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**优点**:
- ✅ 使用官方节点，稳定性好
- ✅ 免费无限制
- ✅ 延迟低

**缺点**:
- ⚠️ 依赖代理稳定性
- ⚠️ 如果代理断开，服务会中断

---

### 混合方案：代理 + 备用节点

```bash
# .env
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087

# 优先使用官方节点（通过代理）
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# 备注：如果代理失败，手动切换为:
# BSC_RPC_URL=https://bsc-rpc.publicnode.com
```

---

## ⚙️ 常见代理软件配置

### Clash

1. 打开 Clash
2. 确保 "系统代理" 已启用
3. 查看端口（通常是 7890）
4. 在 .env 中配置:

```bash
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### V2rayU

1. 打开 V2rayU
2. 确保服务已启动
3. 默认端口: 1087
4. 在 .env 中配置:

```bash
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087
```

### Shadowsocks

1. 打开 Shadowsocks
2. 查看本地端口（通常是 1080）
3. 在 .env 中配置:

```bash
HTTP_PROXY=http://127.0.0.1:1080
HTTPS_PROXY=http://127.0.0.1:1080
```

---

## 🔧 SOCKS5 代理配置

如果你的代理是 SOCKS5 类型，需要使用 `socks-proxy-agent`:

### 1. 安装依赖

```bash
npm install socks-proxy-agent
```

### 2. 配置代理

```bash
# .env
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080
```

代码已经支持 SOCKS5，只需在 .env 中使用 `socks5://` 协议即可。

---

## 🐛 故障排除

### 问题 1: 代理配置后仍然连接失败

**检查清单**:

1. ✅ 代理软件是否正在运行？
2. ✅ 端口号是否正确？
3. ✅ 代理是否允许访问目标网站？

**解决方法**:

```bash
# 测试代理是否工作
curl -x http://127.0.0.1:1087 https://www.google.com

# 如果失败，检查代理设置
```

### 问题 2: 启动时没有看到 "使用代理" 消息

**原因**: 环境变量未生效

**解决方法**:

```bash
# 方法 1: 重新加载 .env
npm run monitor

# 方法 2: 手动设置环境变量
export HTTP_PROXY=http://127.0.0.1:1087
export HTTPS_PROXY=http://127.0.0.1:1087
npm run monitor
```

### 问题 3: 代理连接超时

**可能原因**:
- 代理软件超时设置太短
- RPC 节点响应慢

**解决方法**:

1. 增加代理超时时间（在代理软件中设置）
2. 或使用更快的 RPC 节点:

```bash
BSC_RPC_URL=https://bsc-rpc.publicnode.com
```

### 问题 4: 部分请求成功，部分失败

**原因**: 代理规则设置问题

**解决方法**:

在代理软件中添加以下域名到代理规则：
- `bsc-dataseed*.binance.org`
- `api.mainnet-beta.solana.com`
- `nodereal.io`
- `quicknode.com`

---

## 💡 性能优化建议

### 1. 使用全局代理

在代理软件中设置全局模式，而不是 PAC 模式。

### 2. 选择低延迟节点

在代理软件中选择延迟最低的服务器节点。

### 3. 直连备用方案

如果代理不稳定，考虑使用不需要代理的 RPC 节点：

```bash
# 不需要代理的节点
BSC_RPC_URL=https://bsc-rpc.publicnode.com
SOLANA_RPC_URL=https://solana-rpc.publicnode.com

# 暂时禁用代理
# HTTP_PROXY=http://127.0.0.1:1087
# HTTPS_PROXY=http://127.0.0.1:1087
```

---

## 🔐 安全提示

1. **不要在公共 Git 仓库中提交 .env 文件**
   - .env 已在 .gitignore 中

2. **使用本地代理**
   - 推荐使用 127.0.0.1 而不是公共代理

3. **定期更新代理配置**
   - 确保代理服务器是最新的

---

## 📊 代理状态监控

查看实时日志判断代理是否正常工作：

```bash
npm run monitor
```

正常输出：
```
🔗 初始化 BSC 监控服务...
🌐 使用代理: http://127.0.0.1:1087    # ✅ 代理已启用
✅ 使用 HTTP 连接
✅ 连接成功！当前区块: 34567890       # ✅ 连接成功
📊 初始化池子: WBNB/BUSD
✅ 池子初始化完成
👀 开始监听事件...
✅ BSC 监控服务已启动
```

---

## 🎯 推荐组合

### 中国大陆用户

```bash
# 使用代理 + 官方节点（最佳性能）
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 网络受限地区

```bash
# 使用代理 + 付费节点（最高稳定性）
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087
BSC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### 无网络限制地区

```bash
# 不使用代理，直连第三方节点
BSC_RPC_URL=https://bsc-rpc.publicnode.com
SOLANA_RPC_URL=https://solana-rpc.publicnode.com
```

---

## 📞 需要帮助？

如果代理配置仍有问题：

1. 检查 `TROUBLESHOOTING.md` 
2. 查看 `RPC_NODES.md` 了解更多节点选项
3. 确认代理软件日志
4. 测试代理连接是否正常

---

最后更新: 2024-11-20

**当前推荐配置**（中国大陆用户）:
```bash
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

