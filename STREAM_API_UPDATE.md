# 📡 QuickNode Stream API 更新指南

## 📅 创建时间
2024年11月24日

**官方文档**: https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream

---

## 🎯 API 端点

```
PATCH https://api.quicknode.com/streams/rest/v1/streams/{id}
```

---

## 🔑 认证

### Headers

```javascript
{
  'accept': 'application/json',
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_API_KEY'  // 从 QuickNode Dashboard 获取
}
```

---

## 📝 可更新的参数

根据 [官方文档](https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream)，以下参数可以更新：

### 基本配置

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | string | Stream 名称 |
| `dataset_batch_size` | integer | 数据集批次大小 |
| `include_stream_metadata` | string | 包含 Stream 元数据位置 (`body`/`header`) |
| `status` | string | Stream 状态 (`active`/`paused`) |

### 区块处理

| 参数 | 类型 | 说明 |
|------|------|------|
| `start_range` | integer | 起始区块 |
| `end_range` | integer | 结束区块 |
| `fix_block_reorgs` | integer | 修复区块重组（0 或 1） |
| `keep_distance_from_tip` | integer | 距离链尖的区块数 |
| `elastic_batch_enabled` | boolean | 启用弹性批处理 |

### 过滤器配置

| 参数 | 类型 | 说明 |
|------|------|------|
| `filter_function` | string | Base64 编码的过滤器 JavaScript 函数 |
| `filter_config` | object | 过滤器配置对象 |

### Webhook 目标配置

| 参数 | 类型 | 说明 |
|------|------|------|
| `destination` | string | 目标类型 (`webhook`/`s3`/`postgres` 等) |
| `destination_attributes` | object | 目标配置 |
| `destination_attributes.url` | string | Webhook URL |
| `destination_attributes.compression` | string | 压缩类型 (`none`/`gzip`) |
| `destination_attributes.headers` | object | 自定义 HTTP Headers |
| `destination_attributes.max_retry` | integer | 最大重试次数 |
| `destination_attributes.retry_interval_sec` | integer | 重试间隔（秒） |
| `destination_attributes.post_timeout_sec` | integer | POST 超时（秒） |

---

## 💡 我们的实现

### 新增的函数

#### 1. `updateStreamConfig(config)` - 通用配置更新

```javascript
const { updateStreamConfig } = require('./src/monitor/streams/streamManager');

// 更新任意 Stream 配置
const result = await updateStreamConfig({
  dataset_batch_size: 1,
  include_stream_metadata: 'body',
  destination: 'webhook',
  fix_block_reorgs: 0,
  keep_distance_from_tip: 0,
  destination_attributes: {
    url: 'http://localhost:3000/webhook',
    compression: 'none',
    max_retry: 3,
    retry_interval_sec: 1,
    post_timeout_sec: 30,
  },
  status: 'active',
});
```

#### 2. `updateStreamAddresses(addresses, includeFactory)` - 便捷函数

```javascript
const { updateStreamAddresses } = require('./src/monitor/streams/streamManager');

// 只更新监听地址列表
const success = await updateStreamAddresses([
  '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
  '0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5',
], true);  // true = 自动包含 Factory 地址
```

---

## 🔧 常见更新场景

### 场景 1: 更新 Webhook URL

当你更换服务器或使用 ngrok 时：

```javascript
await updateStreamConfig({
  destination_attributes: {
    url: 'https://new-domain.com/webhook',
    compression: 'none',
    max_retry: 3,
    retry_interval_sec: 1,
    post_timeout_sec: 30,
  },
});
```

**命令行**:
```bash
node update-stream-example.js 3
```

---

### 场景 2: 添加新的交易对到监听列表

当检测到新的 PairCreated 事件时：

```javascript
// 自动调用（在 eventProcessor.js 中）
const pairs = await pairRepository.getRecentPairs(200);
const addresses = pairs.map(p => p.address.toLowerCase());
await updateStreamAddresses(addresses, true);
```

**手动**:
```bash
node update-stream-example.js 2
```

---

### 场景 3: 暂停/激活 Stream

维护或测试时：

```javascript
// 暂停
await updateStreamConfig({ status: 'paused' });

// 激活
await updateStreamConfig({ status: 'active' });
```

**命令行**:
```bash
# 暂停
node update-stream-example.js 4 paused

# 激活
node update-stream-example.js 4 active
```

---

### 场景 4: 更新过滤器函数

需要修改事件过滤逻辑时：

```javascript
// 1. 编写过滤器函数
const filterFunction = `
function main(stream) {
  const events = [];
  // 你的过滤逻辑
  return { events };
}
`;

// 2. 转换为 Base64
const base64Filter = Buffer.from(filterFunction).toString('base64');

// 3. 更新
await updateStreamConfig({
  filter_function: base64Filter,
});
```

**注意**: 通常在 QuickNode Dashboard 中更新过滤器更方便。

---

### 场景 5: 调整重试策略

当 Webhook 不稳定时：

```javascript
await updateStreamConfig({
  destination_attributes: {
    max_retry: 5,              // 增加重试次数
    retry_interval_sec: 2,     // 增加重试间隔
    post_timeout_sec: 60,      // 增加超时时间
  },
});
```

---

### 场景 6: 更新区块处理配置

需要重新处理历史数据时：

```javascript
await updateStreamConfig({
  start_range: 35000000,        // 起始区块
  end_range: 36000000,          // 结束区块（可选）
  fix_block_reorgs: 1,          // 启用重组修复
  keep_distance_from_tip: 10,   // 距离链尖 10 个区块
});
```

---

## 📋 完整示例

### 示例 1: 初始化 Stream 配置

```javascript
const { updateStreamConfig } = require('./src/monitor/streams/streamManager');

async function initializeStream() {
  const FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
  
  const config = {
    // 基本配置
    dataset_batch_size: 1,
    include_stream_metadata: 'body',
    status: 'active',
    
    // 区块配置
    fix_block_reorgs: 0,
    keep_distance_from_tip: 0,
    
    // Webhook 配置
    destination: 'webhook',
    destination_attributes: {
      url: process.env.WEBHOOK_URL || 'http://localhost:3000/webhook',
      compression: 'none',
      headers: {
        'Content-Type': 'application/json',
      },
      max_retry: 3,
      retry_interval_sec: 1,
      post_timeout_sec: 30,
    },
    
    // 过滤器配置
    filter_config: {
      type: 'logs',
      addresses: [FACTORY_ADDRESS.toLowerCase()],
      topics: [
        '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
        '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap V2
        '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // Mint V2
        '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496', // Burn V2
        '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1', // Sync
      ],
    },
  };
  
  const result = await updateStreamConfig(config);
  
  if (result) {
    console.log('✅ Stream 初始化成功！');
    return result;
  } else {
    console.error('❌ Stream 初始化失败');
    return false;
  }
}

initializeStream();
```

---

### 示例 2: 使用官方文档的示例

根据 [官方文档](https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream)：

```javascript
const axios = require('axios');

async function updateStreamOfficial() {
  const STREAM_ID = process.env.QUICKNODE_STREAM_ID;
  const API_KEY = process.env.QUICKNODE_API_KEY;

  const config = {
    filter_function: 'ZnVuY3Rpb24gbWFpbihkYXRhKSB7CiAgICB2YXIgbnVtYmVyRGVjaW1hbCA9IHBhcnNlSW50KGRhdGEuc3RyZWFtRGF0YS5udW1iZXIsIDE2KTsKICAgIHZhciBmaWx0ZXJlZERhdGEgPSB7CiAgICAgICAgaGFzaDogZGF0YS5zdHJlYW1EYXRhLmhhc2gsCiAgICAgICAgbnVtYmVyOiBudW1iZXJEZWNpbWFsCiAgICB9OwogICAgcmV0dXJuIGZpbHRlcmVkRGF0YTsKfQ==',
    start_range: 100,
    end_range: 200,
    dataset_batch_size: 1,
    include_stream_metadata: 'body',
    destination: 'webhook',
    fix_block_reorgs: 0,
    keep_distance_from_tip: 0,
    destination_attributes: {
      url: 'https://webhook.site',
      compression: 'none',
      headers: {
        'Content-Type': 'Test',
        'Authorization': 'again'
      },
      max_retry: 3,
      retry_interval_sec: 1,
      post_timeout_sec: 10
    },
    status: 'active'
  };

  try {
    const response = await axios.patch(
      `https://api.quicknode.com/streams/rest/v1/streams/${STREAM_ID}`,
      config,
      {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
      }
    );

    console.log('✅ Stream 更新成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Stream 更新失败:', error.response?.data || error.message);
    return false;
  }
}
```

---

## 🧪 测试

### 运行示例脚本

```bash
# 查看帮助
node update-stream-example.js

# 运行示例 2（更新地址列表）
node update-stream-example.js 2

# 运行示例 3（更新 Webhook URL）
node update-stream-example.js 3

# 运行示例 4（暂停 Stream）
node update-stream-example.js 4 paused

# 运行示例 4（激活 Stream）
node update-stream-example.js 4 active
```

---

## 📊 返回数据

成功更新后，API 返回完整的 Stream 配置：

```json
{
  "id": "77c7177a-d8df-48b4-b8d4-49ca39c3aff7",
  "created_at": "2024-11-24T12:00:00Z",
  "updated_at": "2024-11-24T14:30:00Z",
  "name": "BSC LP Monitor",
  "network": "bnbchain-mainnet",
  "dataset": "block_with_receipts",
  "region": "usa_east",
  "dataset_batch_size": 1,
  "include_stream_metadata": "body",
  "destination": "webhook",
  "fix_block_reorgs": 0,
  "keep_distance_from_tip": 0,
  "destination_attributes": {
    "url": "http://localhost:3000/webhook",
    "compression": "none",
    "max_retry": 3,
    "retry_interval_sec": 1,
    "post_timeout_sec": 30
  },
  "status": "active",
  "sequence": 123456,
  "current_hash": "0x..."
}
```

---

## ⚠️ 注意事项

### 1. 只更新需要修改的字段

```javascript
// ✅ 好：只更新 URL
await updateStreamConfig({
  destination_attributes: {
    url: 'https://new-url.com/webhook',
  },
});

// ❌ 不好：更新所有字段（不必要）
await updateStreamConfig({
  dataset_batch_size: 1,
  include_stream_metadata: 'body',
  // ... 很多不需要更新的字段
});
```

### 2. filter_function 必须是 Base64 编码

```javascript
// ✅ 正确
const filterCode = `function main(stream) { return stream; }`;
const base64 = Buffer.from(filterCode).toString('base64');
await updateStreamConfig({ filter_function: base64 });

// ❌ 错误
await updateStreamConfig({ 
  filter_function: `function main(stream) { return stream; }` 
});
```

### 3. 更新地址列表会覆盖现有列表

```javascript
// ⚠️  注意：这会替换整个地址列表
await updateStreamConfig({
  filter_config: {
    type: 'logs',
    addresses: ['0xnew...'],  // 旧地址会被移除
    topics: [...],
  },
});
```

### 4. 暂停 Stream 不会删除配置

```javascript
// 暂停 Stream（配置保留，可以随时激活）
await updateStreamConfig({ status: 'paused' });

// 激活 Stream
await updateStreamConfig({ status: 'active' });
```

---

## 📚 相关文档

- [官方 API 文档](https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream)
- `FACTORY_STREAMS_SETUP.md` - Factory Streams 配置指南
- `FINAL_SETUP_GUIDE.md` - 完整设置指南
- `streamManager.js` - 实现代码

---

## 🎯 最佳实践

1. **使用便捷函数** - 对于常见操作（如更新地址），使用 `updateStreamAddresses()`
2. **批量更新** - 一次更新多个参数而不是多次调用
3. **验证配置** - 更新后调用 `getStreamInfo()` 验证
4. **错误处理** - 总是检查返回值
5. **日志记录** - 记录所有配置更改

---

## ✅ 验证清单

更新 Stream 后，确认：

- [ ] 返回的 `status` 是否为 `active`
- [ ] `destination_attributes.url` 是否正确
- [ ] `filter_config.addresses` 包含所需的地址
- [ ] `filter_config.topics` 包含所需的事件签名
- [ ] 测试 Webhook 是否能收到数据

---

**现在你可以使用官方 API 完整地更新 Stream 配置了！** 🎉

