# 🔧 使用 Next.js API 路由接收 Webhook

## 📅 更新时间
2024年11月24日

---

## ✅ 为什么使用 Next.js API 路由？

### Express 的问题
- ❌ TCP 分包处理不稳定
- ❌ 大数据包（>3KB）容易丢失数据
- ❌ body-parser 配置复杂

### Next.js 的优势
- ✅ 内置的 body 解析更可靠
- ✅ 自动处理分包问题
- ✅ 配置简单，开箱即用
- ✅ 已经在项目中，无需额外服务

---

## 📁 文件结构

```
src/pages/api/streams/
└── webhook.js          # Webhook 处理器
```

---

## 🔧 配置步骤

### 1. 创建 API 路由

文件路径: `src/pages/api/streams/webhook.js`

```javascript
// 禁用默认 body 解析，使用自定义配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // 支持大数据包
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 处理逻辑...
}
```

### 2. 启动 Next.js 开发服务器

```bash
npm run dev
```

Webhook URL: `http://localhost:3000/api/streams/webhook`

### 3. 在 QuickNode 中配置 Webhook

**本地开发 (使用 ngrok)**:
```bash
# 启动 ngrok
ngrok http 3000

# 配置 Webhook URL
https://your-ngrok-url.ngrok.io/api/streams/webhook
```

**生产环境**:
```
https://your-domain.com/api/streams/webhook
```

---

## 🚀 使用方法

### 方法 1: 仅启动 Next.js（推荐）

```bash
# 启动 Next.js
npm run dev
```

- Webhook: `http://localhost:3000/api/streams/webhook`
- 前端: `http://localhost:3000`

### 方法 2: Next.js + Factory 监听器

```bash
# 终端 1: Next.js
npm run dev

# 终端 2: Factory 监听器（可选）
node src/monitor/factoryListener.js
```

---

## 📊 数据流

```
QuickNode Stream
    ↓
[HTTPS POST]
    ↓
Next.js API Route
/api/streams/webhook
    ↓
handleFilteredEvents()
    ↓
PostgreSQL Database
```

---

## 🔍 调试

### 查看日志

Next.js 开发服务器会显示所有日志：

```bash
npm run dev
```

期望输出：

```
📨 收到 Streams Webhook 数据 (Next.js)
   Content-Type: application/json
   Content-Length: 3123
✅ 匹配格式2：对象格式（JavaScript 过滤器）
⚠️  事件缺少区块信息，从 Headers 补充: 69325042
   处理 4 个预过滤事件...
💱 Swap: 0x8665a78c...
✅ 处理完成，共 4 个事件
```

### 测试 Webhook

```bash
curl -X POST http://localhost:3000/api/streams/webhook \
  -H "Content-Type: application/json" \
  -H "Batch-Start-Range: 69325042" \
  -d @test-webhook-data.json
```

### 健康检查

访问: `http://localhost:3000/api/health`

创建健康检查端点（可选）:

```javascript
// src/pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}
```

---

## ⚙️ Next.js 配置

### bodyParser 配置

```javascript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',  // 最大请求体大小
    },
  },
};
```

### 禁用 body 解析（如果需要）

```javascript
export const config = {
  api: {
    bodyParser: false,  // 完全禁用
  },
};
```

---

## 🔄 从 Express 迁移

### 旧方式 (Express)

```bash
# 需要单独运行 webhook 服务器
npm run monitor:streams
# 监听端口: 3001
```

### 新方式 (Next.js)

```bash
# 只需要启动 Next.js
npm run dev
# 监听端口: 3000
```

### 优势对比

| 特性 | Express | Next.js |
|------|---------|---------|
| 端口 | 3001 | 3000 |
| 进程 | 独立进程 | 集成在 Next.js |
| 分包处理 | 手动处理 | 自动处理 |
| 大数据包 | ❌ 问题 | ✅ 可靠 |
| 配置复杂度 | 高 | 低 |
| 前端访问 | 需要代理 | 同源，无需代理 |

---

## 🎯 最佳实践

### 1. 使用环境变量

```javascript
// .env.local
WEBHOOK_SECRET=your-secret-key
```

```javascript
// webhook.js
const webhookSecret = process.env.WEBHOOK_SECRET;

// 验证签名
if (req.headers['x-qn-signature'] !== expectedSignature) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. 添加请求限流

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 100 // 最多100个请求
});

export default limiter(async function handler(req, res) {
  // ...
});
```

### 3. 错误处理

```javascript
try {
  await handleFilteredEvents(payload.events);
  return res.status(200).json({ status: 'success' });
} catch (error) {
  console.error('处理失败:', error);
  
  // 仍返回 200，避免 QuickNode 重试
  return res.status(200).json({ 
    status: 'error', 
    error: error.message 
  });
}
```

---

## 📝 完整示例

### 包含所有功能的 webhook.js

```javascript
import { handleFilteredEvents } from '../../../monitor/streams/eventProcessor';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    console.log('\n📨 收到 Webhook 数据');
    
    const payload = req.body;
    const blockNumber = req.headers['batch-start-range'];
    
    // 补充区块信息
    if (payload.events && blockNumber) {
      payload.events.forEach(event => {
        if (!event.blockNumber) {
          event.blockNumber = blockNumber;
        }
      });
    }
    
    // 处理事件
    await handleFilteredEvents(payload.events || []);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 处理完成，耗时 ${duration}ms`);
    
    return res.status(200).json({ 
      status: 'success',
      processed: payload.events?.length || 0,
      duration
    });
  } catch (error) {
    console.error('❌ 处理失败:', error);
    return res.status(200).json({ 
      status: 'error',
      error: error.message 
    });
  }
}
```

---

## 🚨 常见问题

### Q: 为什么错误也返回 200？

A: 防止 QuickNode 不断重试。如果返回 4xx/5xx，QuickNode 会重复发送相同数据。

### Q: 如何处理重复的事件？

A: 数据库有唯一约束（transaction_hash + log_index），重复的事件会被自动忽略。

### Q: Next.js 可以处理多大的数据？

A: 配置中设置的 `sizeLimit: '100mb'` 可以处理非常大的数据包。实际上 QuickNode 的 webhook 数据通常在几KB到几MB之间。

### Q: 需要关闭 Express webhook 服务器吗？

A: 是的。使用 Next.js API 路由后，就不需要单独的 Express 服务器了。

---

## 📚 相关文档

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Next.js API Config](https://nextjs.org/docs/api-routes/api-middlewares)
- [FIX_EMPTY_BODY.md](./FIX_EMPTY_BODY.md) - Express 的问题分析

---

## ✅ 验证清单

- [x] 创建 API 路由文件
- [x] 配置 bodyParser
- [x] 从 Headers 提取区块信息
- [x] 处理两种数据格式
- [x] 添加错误处理
- [x] 添加详细日志
- [x] 创建文档

---

## 🎊 下一步

1. ✅ **已完成** - 创建 Next.js API 路由
2. 🔄 **执行** - 启动 Next.js: `npm run dev`
3. 🔄 **配置** - 在 QuickNode 更新 Webhook URL
4. 🔄 **测试** - 验证数据接收

---

**Next.js API 路由已就绪！** 🚀

