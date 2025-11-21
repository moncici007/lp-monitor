# 事件监听问题解决方案 🔧

## ❌ 错误说明

```
TypeError: Cannot read properties of undefined (reading 'on')
at BSCMonitor.start (/root/lp-monitor/lib/monitors/bsc-monitor.js:446:11)
```

## 🔍 问题原因

这个错误通常由以下原因之一引起：

### 1. HTTP Provider 的限制

**Web3.js 使用 HTTP Provider 时，事件监听功能受限或不可用。**

```javascript
// ❌ HTTP Provider - 事件监听可能不工作
const web3 = new Web3(new Web3.providers.HttpProvider('https://...'));
contract.events.Swap()  // 可能返回 undefined

// ✅ WebSocket Provider - 事件监听完全支持
const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://...'));
contract.events.Swap()  // 正常工作
```

### 2. Web3.js 版本问题

不同版本的 Web3.js 对事件监听的 API 支持不同。

---

## 🎯 解决方案

### 方案 1: 使用 WebSocket RPC（推荐 ⭐⭐⭐⭐⭐）

#### 为什么推荐？
- ✅ 事件监听完全支持
- ✅ 实时性最好（秒级）
- ✅ 不需要轮询
- ✅ 资源消耗低

#### 配置步骤

1. **获取 WebSocket RPC URL**

推荐使用 **NodeReal**（免费层每天 300M 请求）：
- 访问: https://nodereal.io/
- 注册账号
- 创建 BSC Mainnet 项目
- 获取 WebSocket URL

2. **更新 .env 配置**

```bash
# .env

# 使用 WebSocket RPC（推荐）
BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# 或者使用其他 WebSocket 节点
# BSC_WSS_URL=wss://bsc-ws-node.nariox.org:443

# HTTP RPC 作为备用（可选）
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# 代理配置
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087

# 池子地址
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
```

3. **重启监控服务**

```bash
npm run monitor
```

你应该看到：
```
✅ 使用 WebSocket 连接
✅ 连接成功！当前区块: 68906387
```

---

### 方案 2: 使用轮询方式（备选 ⭐⭐⭐）

如果无法使用 WebSocket，可以改用轮询方式。

#### 原理

定期查询新区块，检查是否有新事件。

#### 实现方法

创建一个轮询监听器：`lib/monitors/bsc-monitor-polling.js`

```javascript
class BSCMonitorPolling {
  async start() {
    // 记录上次检查的区块
    let lastBlock = await this.web3.eth.getBlockNumber();
    
    // 每 3 秒检查一次
    setInterval(async () => {
      const currentBlock = await this.web3.eth.getBlockNumber();
      
      if (currentBlock > lastBlock) {
        // 获取这段时间的事件
        const events = await contract.getPastEvents('Swap', {
          fromBlock: lastBlock + 1,
          toBlock: currentBlock
        });
        
        // 处理事件
        for (const event of events) {
          await this.handleSwapEvent(poolAddress, event);
        }
        
        lastBlock = currentBlock;
      }
    }, 3000);
  }
}
```

**优点**：
- ✅ 支持所有 RPC 节点
- ✅ 可以通过 HTTP 代理

**缺点**：
- ⚠️ 有延迟（3-5 秒）
- ⚠️ 消耗更多 RPC 请求
- ⚠️ 代码复杂

---

### 方案 3: 临时调试（快速验证）

先让程序能运行起来，确认其他部分正常。

#### 修改代码添加调试信息

在 `lib/monitors/bsc-monitor.js` 的 `start()` 函数中添加：

```javascript
// 在 for 循环前添加
console.log('📊 poolData 内容:', this.poolData.size);
for (const [addr, data] of this.poolData) {
  console.log(`  - ${addr}:`, {
    hasContract: !!data.contract,
    hasEvents: !!(data.contract && data.contract.events),
    symbols: `${data.token0_symbol}/${data.token1_symbol}`
  });
}
```

这样可以看到问题具体在哪里。

---

## 📝 推荐的免费 WebSocket 节点

### 1. NodeReal（推荐 ⭐⭐⭐⭐⭐）

```bash
# 免费层: 每天 300M 请求
# 注册: https://nodereal.io/

BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY
```

### 2. Ankr（备选）

```bash
# 免费使用
# 可能有速率限制

BSC_WSS_URL=wss://rpc.ankr.com/bsc/ws
```

### 3. 其他公共节点

```bash
# BlastAPI
BSC_WSS_URL=wss://bsc-mainnet.public.blastapi.io

# GetBlock
BSC_WSS_URL=wss://bsc.getblock.io/YOUR_API_KEY/mainnet/
```

---

## 🔧 完整的配置示例

### 配置 1: 使用 NodeReal WebSocket + 代理

```bash
# .env

# 数据库
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/lp_monitor

# 代理（用于访问其他资源）
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087

# BSC WebSocket（NodeReal）
BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# 池子地址
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16

# Solana 暂时禁用
# SOLANA_POOL_ADDRESSES=...

# 预警阈值
LARGE_TRADE_THRESHOLD_USD=10000
```

### 配置 2: 使用公共 WebSocket（无需注册）

```bash
# .env

DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/lp_monitor

HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087

# 使用公共 WebSocket（可能不稳定）
BSC_WSS_URL=wss://rpc.ankr.com/bsc/ws

BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16

LARGE_TRADE_THRESHOLD_USD=10000
```

---

## 🚀 快速开始

### 1. 选择方案

**如果想要最佳体验**：
→ 方案 1：注册 NodeReal，使用 WebSocket

**如果想要快速测试**：
→ 方案 1：使用公共 WebSocket 节点

**如果没有 WebSocket**：
→ 方案 2：实现轮询方式（需要修改代码）

### 2. 更新配置

编辑 `.env` 文件：
```bash
nano .env
```

添加 WebSocket URL：
```bash
BSC_WSS_URL=wss://your-websocket-url
```

### 3. 测试连接

```bash
# 测试 WebSocket 连接
wscat -c wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# 发送测试请求
{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}
```

### 4. 启动监控

```bash
npm run monitor
```

---

## 🔍 故障排除

### 问题 1: WebSocket 连接失败

```
❌ WebSocket 连接失败: Connection refused
```

**解决方案**：
1. 检查 WSS URL 是否正确
2. 检查 API Key 是否有效
3. 检查防火墙是否阻止 WebSocket

### 问题 2: 通过代理无法连接 WebSocket

**解决方案**：
```bash
# WebSocket 代理配置比较复杂
# 建议：WebSocket 直连，其他资源走代理

# 只为 HTTP 请求使用代理
HTTP_PROXY=http://127.0.0.1:1087
HTTPS_PROXY=http://127.0.0.1:1087

# WebSocket 直接连接
BSC_WSS_URL=wss://your-websocket-url
```

### 问题 3: 事件没有触发

**检查清单**：
1. ✅ WebSocket 连接正常
2. ✅ 池子地址正确
3. ✅ 池子有交易活动
4. ✅ 等待 1-5 分钟

---

## 📊 HTTP vs WebSocket 对比

| 特性 | HTTP Provider | WebSocket Provider |
|------|--------------|-------------------|
| 事件监听 | ❌ 不支持或受限 | ✅ 完全支持 |
| 实时性 | ⚠️ 需要轮询（3-5秒） | ✅ 实时推送（<1秒） |
| 资源消耗 | ⚠️ 较高（频繁请求） | ✅ 低（长连接） |
| 代理支持 | ✅ 完全支持 | ⚠️ 可能需要特殊配置 |
| 稳定性 | ✅ 高（无状态） | ⚠️ 需要重连机制 |
| 推荐度 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 💡 建议

### 生产环境

1. **首选**：付费 WebSocket 节点（NodeReal、QuickNode）
2. **备用**：免费公共 WebSocket 节点
3. **降级**：HTTP + 轮询方式

### 开发测试

1. **快速开始**：免费公共 WebSocket
2. **本地测试**：可以用 HTTP + 轮询

---

## 📚 相关文档

- **PROXY_SETUP.md** - 代理配置详解
- **RPC_NODES.md** - RPC 节点选择
- **TROUBLESHOOTING.md** - 故障排除

---

最后更新: 2024-11-20

**推荐配置**: 使用 NodeReal 的免费 WebSocket 节点，获得最佳的实时监控体验！

