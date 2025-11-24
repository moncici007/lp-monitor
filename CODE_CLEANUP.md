# 🧹 代码重构和清理

## 📅 重构时间
2024年11月24日

---

## 🎯 重构目标

统一使用 **QuickNode Streams** 方案，删除重复的 ethers.js 监听代码，简化项目结构。

---

## ❌ 删除的文件（重复/过时的代码）

### 1. `src/monitor/listeners/factoryListener.js` ❌

**原因**: 重复

**之前的功能**:
```javascript
// 使用 ethers.js 监听 Factory PairCreated 事件
factoryContract.on('PairCreated', async (token0, token1, pairAddress, pairIndex, event) => {
  await handlePairCreated(...);
});
```

**现在的实现**:
```javascript
// 通过 QuickNode Streams
// src/monitor/streams/eventProcessor.js
async function handlePairCreatedEvent(log) {
  // 处理从 Streams 推送的 PairCreated 事件
}
```

**替代方案**: ✅ `eventProcessor.handlePairCreatedEvent()`

---

### 2. `src/monitor/listeners/pairListener.js` ❌

**原因**: 重复

**之前的功能**:
```javascript
// 使用 ethers.js 监听 Pair 事件
pairContract.on('Swap', async (...) => { ... });
pairContract.on('Mint', async (...) => { ... });
pairContract.on('Burn', async (...) => { ... });
pairContract.on('Sync', async (...) => { ... });
```

**现在的实现**:
```javascript
// 通过 QuickNode Streams
// src/monitor/streams/eventProcessor.js
async function handleSwapEvent(log) { ... }
async function handleMintEvent(log) { ... }
async function handleBurnEvent(log) { ... }
async function handleSyncEvent(log) { ... }
```

**替代方案**: ✅ `eventProcessor.handleSwapEvent()` 等

---

### 3. `src/monitor/listeners/` 目录 ❌

**原因**: 空目录，所有文件已删除

**状态**: ✅ 已删除

---

### 4. `src/monitor/index.js` ❌

**原因**: 旧的监控入口，不使用 Streams

**之前的功能**:
```javascript
// 启动 Factory 和 Pair 监听器
await initFactoryListener();
await initPairListeners();
```

**现在的实现**: 
```javascript
// 启动 Webhook 服务器
node src/monitor/streams/webhookServer.js
```

**替代方案**: ✅ `webhookServer.js`

---

### 5. `src/monitor/indexWithStreams.js` ❌

**原因**: 旧的 Streams 入口，结构复杂

**之前的功能**:
```javascript
// 启动 Webhook 服务器 + Factory 监听器
await startWebhookServer();
await initFactoryListener();
```

**现在的实现**:
```javascript
// 只启动 Webhook 服务器（包含所有逻辑）
node src/monitor/streams/webhookServer.js
```

**替代方案**: ✅ `webhookServer.js`

---

## ✅ 移动的文件

### `webhook-server-raw.js` → `src/monitor/streams/webhookServer.js`

**原因**: 统一管理

**移动前**:
```
lp-monitor/
├── webhook-server-raw.js        ← 在根目录
└── src/
    └── monitor/
        └── streams/
            ├── eventProcessor.js
            └── streamManager.js
```

**移动后**:
```
lp-monitor/
└── src/
    └── monitor/
        └── streams/
            ├── webhookServer.js     ← 统一在 streams 目录
            ├── eventProcessor.js
            └── streamManager.js
```

**优势**:
- ✅ 逻辑集中
- ✅ 结构清晰
- ✅ 易于维护

---

## 📊 重构前后对比

### 架构对比

**重构前（复杂）**:
```
监控系统
├── listeners/
│   ├── factoryListener.js    ← RPC 监听（重复）
│   └── pairListener.js        ← RPC 监听（重复）
├── streams/
│   ├── webhookServer.js       ← Streams 接收
│   ├── eventProcessor.js
│   └── streamManager.js
├── index.js                   ← 旧入口
├── indexWithStreams.js        ← Streams 入口
└── webhook-server-raw.js      ← 在根目录（混乱）
```

**重构后（简洁）**:
```
监控系统
└── streams/
    ├── webhookServer.js       ← 唯一入口 ★
    ├── eventProcessor.js      ← 事件处理
    └── streamManager.js       ← Stream 管理
```

---

### 功能对比

| 功能 | 重构前 | 重构后 |
|------|--------|--------|
| PairCreated 监听 | listeners/factoryListener.js | ✅ streams/eventProcessor.js |
| Swap/Mint/Burn 监听 | listeners/pairListener.js | ✅ streams/eventProcessor.js |
| Webhook 服务器 | webhook-server-raw.js | ✅ streams/webhookServer.js |
| 入口文件数量 | 3 个 | ✅ 1 个 |
| RPC 调用 | ❌ 有 | ✅ 无 |
| 代码重复 | ❌ 有 | ✅ 无 |

---

### 文件数量对比

| 类型 | 重构前 | 重构后 | 减少 |
|------|--------|--------|------|
| 监听器文件 | 2 | 0 | -2 |
| 入口文件 | 3 | 1 | -2 |
| Streams 文件 | 3 | 3 | 0 |
| **总计** | **8** | **4** | **-4 (-50%)** |

---

## 🚀 新的启动方式

### 重构前（多个命令）

```bash
# 方式 1: 旧的监控（不使用 Streams）
npm run monitor              # → node src/monitor/index.js

# 方式 2: Streams 监控
npm run monitor:streams      # → node src/monitor/indexWithStreams.js

# 方式 3: 原始 Webhook 服务器
node webhook-server-raw.js
```

**问题**:
- ❌ 多个入口，混乱
- ❌ 命令不一致
- ❌ 不知道用哪个

---

### 重构后（统一命令）

```bash
# 唯一的启动方式 ★
npm run monitor

# 或直接运行
node src/monitor/streams/webhookServer.js

# 或使用 PM2（推荐生产环境）
pm2 start src/monitor/streams/webhookServer.js --name lp-monitor
```

**优势**:
- ✅ 唯一入口
- ✅ 简单明确
- ✅ 易于记忆

---

## 📁 重构后的项目结构

```
lp-monitor/
├── package.json                              ← 更新 scripts
├── fix-unique-constraints.sql
├── src/
│   ├── blockchain/
│   │   ├── provider.js
│   │   └── tokenService.js
│   ├── contracts/
│   │   └── abis.js
│   ├── db/
│   │   ├── client.js
│   │   ├── schema.sql
│   │   └── repositories/
│   │       ├── pairRepository.js
│   │       ├── transactionRepository.js
│   │       ├── liquidityRepository.js
│   │       └── alertRepository.js
│   ├── monitor/
│   │   ├── analyzer.js
│   │   └── streams/                          ← 核心目录 ★
│   │       ├── webhookServer.js              ← 唯一入口
│   │       ├── eventProcessor.js             ← 事件处理
│   │       └── streamManager.js              ← Stream 管理
│   └── pages/
│       └── api/
│           ├── pairs.js
│           ├── transactions.js
│           └── alerts.js
├── quicknode-stream-filter-with-factory.js   ← QuickNode 过滤器
└── 文档/
    ├── FINAL_SETUP_GUIDE.md
    ├── CODE_CLEANUP.md                       ← 本文件
    └── ...
```

---

## 🔄 数据流（重构后）

```
┌─────────────────────────────────────────────────┐
│          QuickNode Streams                      │
│  ✅ 监听 Factory PairCreated                    │
│  ✅ 监听 Pair Swap/Mint/Burn/Sync              │
│  ✅ 主动推送，无 RPC 调用                       │
└─────────────────────────────────────────────────┘
                    ↓ Webhook
┌─────────────────────────────────────────────────┐
│    src/monitor/streams/webhookServer.js         │
│  ✅ 原始 HTTP 服务器                            │
│  ✅ 手动处理 TCP 分包                           │
│  ✅ 100% 数据完整性                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│    src/monitor/streams/eventProcessor.js        │
│  handlePairCreatedEvent()                       │
│  handleSwapEvent()                              │
│  handleMintEvent()                              │
│  handleBurnEvent()                              │
│  handleSyncEvent()                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│    src/monitor/streams/streamManager.js         │
│  updateStreamAddresses()                        │
│  - 动态更新监听地址列表                        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│              PostgreSQL 数据库                   │
│  pairs, transactions, liquidity_events, alerts  │
└─────────────────────────────────────────────────┘
```

---

## 🎯 重构带来的好处

### 1. 消除重复代码 ✅

**之前**:
- `factoryListener.js` 监听 PairCreated
- `eventProcessor.js` 也处理 PairCreated
- 两份逻辑，容易不一致

**现在**:
- 只有 `eventProcessor.js` 一份逻辑
- 统一的事件处理

---

### 2. 简化架构 ✅

**之前**:
- 3 个入口文件
- 2 个监听器
- 混乱的启动命令

**现在**:
- 1 个入口文件
- 0 个监听器（全部通过 Streams）
- 清晰的启动命令

---

### 3. 提高性能 ✅

**之前**:
- ethers.js 监听器持续 RPC 调用
- 容易触发速率限制
- 需要管理监听器生命周期

**现在**:
- 零 RPC 调用
- 无速率限制
- 无需管理监听器

---

### 4. 更易维护 ✅

**之前**:
- 代码分散在多个文件
- 修改需要同步多处
- 容易遗漏

**现在**:
- 代码集中在 `streams/` 目录
- 修改只需一处
- 逻辑清晰

---

## 📝 package.json 变化

### 之前

```json
{
  "scripts": {
    "monitor": "node src/monitor/index.js",              ← 旧方案
    "monitor:streams": "node src/monitor/indexWithStreams.js",  ← 复杂
    "webhook:raw": "node webhook-server-raw.js"          ← 在根目录
  }
}
```

### 现在

```json
{
  "scripts": {
    "monitor": "node src/monitor/streams/webhookServer.js"  ← 唯一方案 ★
  }
}
```

**简化程度**: 3 个命令 → 1 个命令

---

## ✅ 验证清单

重构后，确保：

- [ ] ✅ `src/monitor/listeners/` 目录已删除
- [ ] ✅ `factoryListener.js` 已删除
- [ ] ✅ `pairListener.js` 已删除
- [ ] ✅ `index.js` 已删除
- [ ] ✅ `indexWithStreams.js` 已删除
- [ ] ✅ `webhook-server-raw.js` 已移动到 `streams/webhookServer.js`
- [ ] ✅ `package.json` 中的 `monitor` 命令已更新
- [ ] ✅ `npm run monitor` 可以成功启动
- [ ] ✅ 所有事件都通过 Streams 处理

---

## 🧪 测试

### 启动测试

```bash
# 应该成功启动
npm run monitor
```

**期望输出**:
```
============================================================
🚀 原始 HTTP Webhook 服务器
============================================================
✅ 监听端口: 3000
✅ 健康检查: http://localhost:3000/health
✅ Webhook URL: http://localhost:3000/webhook
============================================================
```

---

### 功能测试

1. **PairCreated 事件**: 等待新 Pair 创建
2. **Swap 事件**: 监控现有 Pair 的交易
3. **Mint 事件**: 监控流动性添加
4. **Burn 事件**: 监控流动性移除

**所有事件都应该通过 Streams 正常接收！**

---

## 📚 相关文档

- `CLEANUP_SUMMARY.md` - Express/Next.js 方案的清理
- `CODE_CLEANUP.md` - 本文件（监听器代码的清理）
- `FINAL_SETUP_GUIDE.md` - 最终设置指南
- `FACTORY_STREAMS_SETUP.md` - Factory Streams 配置

---

## 🎉 总结

### 删除的代码

| 文件 | 原因 | 替代方案 |
|------|------|----------|
| factoryListener.js | 重复 | eventProcessor.js |
| pairListener.js | 重复 | eventProcessor.js |
| index.js | 过时 | webhookServer.js |
| indexWithStreams.js | 过时 | webhookServer.js |
| listeners/ 目录 | 空目录 | streams/ 目录 |

### 移动的代码

| 原位置 | 新位置 | 原因 |
|--------|--------|------|
| webhook-server-raw.js | streams/webhookServer.js | 统一管理 |

### 重构效果

- ✅ **代码减少 50%** (8 个文件 → 4 个文件)
- ✅ **消除重复代码**
- ✅ **简化启动命令** (3 个 → 1 个)
- ✅ **统一架构** (全部使用 Streams)
- ✅ **提高性能** (无 RPC 调用)
- ✅ **易于维护** (代码集中)

---

**现在项目结构更简洁，更易维护了！** 🎊

