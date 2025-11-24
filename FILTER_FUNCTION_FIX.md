# 🔧 过滤器函数修复说明

## 📅 修复时间
2024年11月24日

---

## ❌ 问题

之前的实现错误地使用了 `filter_config` 字段来更新 Stream：

```javascript
// ❌ 错误的实现
await updateStreamConfig({
  filter_config: {
    type: 'logs',
    addresses: allAddresses,
    topics: EVENT_TOPICS,
  },
});
```

**问题**: QuickNode Stream REST API 的 `PATCH` 端点**不支持** `filter_config` 字段。

---

## ✅ 正确的方式

根据 [官方文档](https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream)，应该使用 **`filter_function`** 字段：

```javascript
// ✅ 正确的实现
await updateStreamConfig({
  filter_function: 'Base64EncodedJavaScriptCode',
});
```

### 参数说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `filter_function` | string | **Base64 编码**的 JavaScript 过滤器函数 |

---

## 🔧 修复内容

### 1. 新增 `generateFilterFunction()` 函数

自动生成过滤器 JavaScript 代码并转换为 Base64：

```javascript
function generateFilterFunction(addresses, topics) {
  // 生成 JavaScript 过滤器代码
  const filterCode = `
function main(stream) {
  const MONITORED_ADDRESSES = new Set(${JSON.stringify(addresses)});
  const EVENT_TOPICS = new Set(${JSON.stringify(topics)});
  
  const events = [];
  for (const block of stream.data) {
    for (const receipt of block.receipts || []) {
      if (receipt.status === "0x1") {
        for (const log of receipt.logs || []) {
          const address = log.address.toLowerCase();
          const topic0 = log.topics[0];
          if (MONITORED_ADDRESSES.has(address) && EVENT_TOPICS.has(topic0)) {
            events.push({
              address: log.address,
              topics: log.topics,
              data: log.data,
              logIndex: log.logIndex,
              transactionHash: receipt.transactionHash,
            });
          }
        }
      }
    }
  }
  return { events };
}
  `.trim();

  // 转换为 Base64
  return Buffer.from(filterCode).toString('base64');
}
```

---

### 2. 修正 `updateStreamAddresses()` 函数

现在使用 `filter_function` 而不是 `filter_config`：

```javascript
async function updateStreamAddresses(pairAddresses, includeFactory = true) {
  // ... 准备地址列表 ...

  // ✅ 生成过滤器函数（Base64 编码）
  const filterFunction = generateFilterFunction(allAddresses, EVENT_TOPICS);

  // ✅ 使用 filter_function 更新
  const result = await updateStreamConfig({
    filter_function: filterFunction,
  });

  return result !== false;
}
```

---

## 📝 使用示例

### 示例 1: 使用便捷函数（推荐）

```javascript
const { updateStreamAddresses } = require('./src/monitor/streams/streamManager');

// 自动生成过滤器并更新
await updateStreamAddresses([
  '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
  '0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5',
], true);  // true = 自动包含 Factory 地址
```

**内部流程**:
1. 准备地址列表（包含 Factory）
2. 调用 `generateFilterFunction()` 生成 Base64 过滤器
3. 调用 `updateStreamConfig({ filter_function: ... })`
4. QuickNode 接收并应用新过滤器

---

### 示例 2: 手动编写过滤器

```javascript
const { updateStreamConfig } = require('./src/monitor/streams/streamManager');

// 1. 编写 JavaScript 过滤器
const filterCode = `
function main(stream) {
  const MONITORED_ADDRESSES = new Set([
    '0xca143ce32fe78f1f7019d7d551a6402fc5350c73', // Factory
    '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
  ]);
  
  const EVENT_TOPICS = new Set([
    '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap
  ]);
  
  const events = [];
  for (const block of stream.data) {
    for (const receipt of block.receipts || []) {
      if (receipt.status === "0x1") {
        for (const log of receipt.logs || []) {
          const address = log.address.toLowerCase();
          const topic0 = log.topics[0];
          if (MONITORED_ADDRESSES.has(address) && EVENT_TOPICS.has(topic0)) {
            events.push({
              address: log.address,
              topics: log.topics,
              data: log.data,
            });
          }
        }
      }
    }
  }
  return { events };
}
`;

// 2. 转换为 Base64
const base64Filter = Buffer.from(filterCode).toString('base64');

// 3. 更新 Stream
await updateStreamConfig({
  filter_function: base64Filter,
});
```

---

### 示例 3: 使用 `generateFilterFunction()`

```javascript
const { generateFilterFunction, updateStreamConfig } = require('./src/monitor/streams/streamManager');

// 定义地址和事件
const addresses = [
  '0xca143ce32fe78f1f7019d7d551a6402fc5350c73', // Factory
  '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
  '0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5',
];

const topics = [
  '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap V2
  '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // Mint V2
];

// 自动生成 Base64 过滤器
const filterFunction = generateFilterFunction(addresses, topics);

// 更新 Stream
await updateStreamConfig({
  filter_function: filterFunction,
});
```

---

## 🧪 测试命令

```bash
# 示例 2: 更新地址列表（使用便捷函数）
node update-stream-example.js 2

# 示例 5: 手动编写过滤器
node update-stream-example.js 5

# 示例 6: 使用自动生成的过滤器
node update-stream-example.js 6
```

---

## 📊 对比

### 旧实现 vs 新实现

| 方面 | 旧实现 ❌ | 新实现 ✅ |
|------|----------|----------|
| 更新字段 | `filter_config` | `filter_function` |
| 内容格式 | JSON 对象 | Base64 字符串 |
| 是否支持 | **不支持** | **官方支持** |
| 过滤器逻辑 | 简单地址/主题匹配 | 完整的 JavaScript 代码 |
| 灵活性 | 受限 | 高度灵活 |

---

## 🎯 关键要点

### 1. `filter_function` 是唯一正确的更新方式

```javascript
// ✅ 正确
await updateStreamConfig({
  filter_function: base64EncodedCode,
});

// ❌ 错误（API 不支持）
await updateStreamConfig({
  filter_config: { ... },
});
```

---

### 2. 必须是 Base64 编码

```javascript
// ✅ 正确
const base64 = Buffer.from(javascriptCode).toString('base64');
await updateStreamConfig({ filter_function: base64 });

// ❌ 错误（未编码）
await updateStreamConfig({ 
  filter_function: javascriptCode  // 必须是 Base64
});
```

---

### 3. JavaScript 函数格式

过滤器函数必须：
- 命名为 `main`
- 接受 `stream` 参数
- 返回一个对象（通常包含 `events` 数组）

```javascript
function main(stream) {
  // 你的过滤逻辑
  return { events: [...] };
}
```

---

### 4. 生成的过滤器会覆盖旧的

每次调用 `updateStreamConfig({ filter_function: ... })` 都会**完全替换**旧的过滤器。

```javascript
// 第一次更新：监听 2 个地址
await updateStreamAddresses(['0xaaa...', '0xbbb...']);

// 第二次更新：监听 3 个地址（完全替换）
await updateStreamAddresses(['0xccc...', '0xddd...', '0xeee...']);
// 现在只监听这 3 个地址，之前的 2 个地址不再监听
```

---

## 📚 相关文档

- [QuickNode 官方 API 文档](https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream)
- `STREAM_API_UPDATE.md` - Stream API 更新指南
- `streamManager.js` - 实现代码
- `update-stream-example.js` - 示例脚本

---

## ✅ 修复验证

### 修复前

```bash
❌ 更新 Stream 失败: filter_config is not a valid field
```

### 修复后

```bash
✅ Stream 配置更新成功
   监听 Factory + 2 个交易对
   过滤器函数已更新（Base64 编码）
```

---

## 🎉 总结

| 修复项 | 状态 |
|--------|------|
| 使用 `filter_function` 而不是 `filter_config` | ✅ |
| 实现 Base64 编码 | ✅ |
| 新增 `generateFilterFunction()` 函数 | ✅ |
| 更新 `updateStreamAddresses()` 函数 | ✅ |
| 添加示例 6（自动生成过滤器） | ✅ |
| 更新文档 | ✅ |

---

**现在 Stream 过滤器更新功能完全符合 QuickNode 官方 API 规范！** 🎊

