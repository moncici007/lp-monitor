# 🔧 原始 HTTP 服务器 - 终极解决方案

## 📅 创建时间
2024年11月24日

---

## 🎯 为什么使用原始 HTTP 服务器？

### 问题根源
QuickNode 发送的大数据包（>3KB）会被 TCP 协议分成多个数据包（分包）。

### 之前尝试的方案
1. ❌ **Express + body-parser** - 无法正确处理分包
2. ❌ **Express + express.json()** - 仍然有问题
3. ⚠️  **Next.js API 路由** - 通常可靠，但可能仍有边缘情况

### 最终解决方案 ✅
**原始 Node.js HTTP 服务器 + 手动监听 `data` 事件**

这是**最可靠**的方式，因为：
- ✅ 直接监听每个 TCP 数据包
- ✅ 手动累积所有数据块
- ✅ 完全控制数据接收过程
- ✅ 不依赖任何中间件

---

## 🔍 工作原理

### TCP 分包问题示例

```
QuickNode 发送: 
{"config":{"monitoredPairsCount":1},"events":[...3KB 数据...]}

TCP 分包后可能变成:
数据包1: {"config":{"monitor
数据包2: edPairsCount":1},"eve
数据包3: nts":[...]}
```

### 手动处理方案

```javascript
let body = '';
let chunks = 0;

// 监听每个数据包
req.on('data', chunk => {
  chunks++;
  body += chunk.toString();  // 累积数据
  console.log(`收到数据块 #${chunks}: ${chunk.length} 字节`);
});

// 所有数据包接收完成
req.on('end', () => {
  console.log(`完成！共 ${chunks} 个数据块，总大小: ${body.length} 字节`);
  const jsonData = JSON.parse(body);  // 现在可以安全解析
  // 处理数据...
});
```

---

## 🚀 使用方法

### 启动服务器

```bash
# 方式 1: 使用 npm script
npm run webhook:raw

# 方式 2: 直接运行
node webhook-server-raw.js

# 方式 3: 指定端口
WEBHOOK_PORT=3000 node webhook-server-raw.js
```

### 服务器输出

```
============================================================
🚀 原始 HTTP Webhook 服务器
============================================================
✅ 监听端口: 3000
✅ 健康检查: http://localhost:3000/health
✅ Webhook URL: http://localhost:3000/webhook

特性:
  ✅ 手动处理 TCP 分包（最可靠）
  ✅ 支持无限大的数据包
  ✅ 详细的数据接收日志
============================================================
```

---

## 📊 接收数据时的日志

### 正常情况（小数据包）

```
📨 收到 Webhook 请求
   Headers: {
     "content-type": "application/json",
     "content-length": "1234",
     "batch-start-range": "69325042"
   }
   📦 收到数据块 #1: 1234 字节
   ✅ 数据接收完成，共 1 个数据块，总大小: 1234 字节
   ✅ JSON 解析成功
   📊 事件数量: 4
   ✅ 处理完成，共 4 个事件
```

### TCP 分包情况（大数据包）

```
📨 收到 Webhook 请求
   Headers: {
     "content-type": "application/json",
     "content-length": "5678"
   }
   📦 收到数据块 #1: 2048 字节
   📦 收到数据块 #2: 2048 字节
   📦 收到数据块 #3: 1582 字节
   ✅ 数据接收完成，共 3 个数据块，总大小: 5678 字节
   ✅ JSON 解析成功
   📊 事件数量: 12
   ✅ 处理完成，共 12 个事件
```

从日志可以清楚看到数据是如何分包接收的！

---

## 🧪 测试

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

期望输出：
```json
{
  "status": "ok",
  "timestamp": "2024-11-24T..."
}
```

### 2. 测试 Webhook（小数据）

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "Batch-Start-Range: 69325042" \
  -d '{"config":{},"events":[{"eventType":"test"}],"stats":{}}'
```

### 3. 测试大数据包

```bash
# 创建大 JSON 文件（模拟 QuickNode 的大数据）
node -e "
const events = Array(100).fill(null).map((_, i) => ({
  eventType: 'swap',
  address: '0x' + '1'.repeat(40),
  data: '0x' + '0'.repeat(1000),
  topics: ['0x' + '2'.repeat(64)]
}));
console.log(JSON.stringify({config:{},events,stats:{}}));
" > large-webhook.json

# 发送大数据
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "Batch-Start-Range: 69325042" \
  -d @large-webhook.json
```

---

## 🔧 QuickNode 配置

### 本地开发

```bash
# 1. 启动服务器
npm run webhook:raw

# 2. 启动 ngrok
ngrok http 3000

# 3. 在 QuickNode 配置
Webhook URL: https://your-ngrok-url.ngrok.io/webhook
```

### 生产环境

```bash
# 使用 PM2 或其他进程管理器
pm2 start webhook-server-raw.js --name webhook

# 或使用 systemd
# 创建 /etc/systemd/system/webhook.service
```

---

## 📋 与其他方案对比

| 特性 | Express | Next.js API | 原始 HTTP |
|------|---------|-------------|-----------|
| 分包处理 | ❌ 不稳定 | ✅ 通常可靠 | ✅ 完全可靠 |
| 数据大小限制 | 需配置 | 需配置 | ✅ 无限制 |
| 调试可见性 | 低 | 中 | ✅ 高（可看到每个数据块） |
| 配置复杂度 | 高 | 中 | ✅ 低（无需配置） |
| 性能 | 中 | 高 | ✅ 最高（无中间件） |
| 代码控制 | 低 | 中 | ✅ 完全控制 |

---

## 🎯 核心代码

### 关键部分

```javascript
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    let chunks = 0;

    // 关键：监听每个数据包
    req.on('data', chunk => {
      chunks++;
      body += chunk.toString();
      // 可以看到每个数据包的到达
    });

    // 关键：等待所有数据包接收完成
    req.on('end', async () => {
      // 现在 body 包含完整的数据
      const jsonData = JSON.parse(body);
      await processEvents(jsonData.events);
      res.end(JSON.stringify({ status: 'success' }));
    });

    // 关键：处理错误
    req.on('error', (error) => {
      console.error('请求错误:', error);
    });
  }
});
```

---

## 💡 高级用法

### 1. 限制最大数据大小

```javascript
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
let body = '';

req.on('data', chunk => {
  body += chunk.toString();
  
  if (body.length > MAX_SIZE) {
    req.destroy();
    res.writeHead(413, { 'Content-Type': 'text/plain' });
    res.end('Payload too large');
  }
});
```

### 2. 添加超时

```javascript
req.setTimeout(30000, () => {
  console.error('请求超时');
  req.destroy();
});
```

### 3. 验证 Content-Type

```javascript
if (req.headers['content-type'] !== 'application/json') {
  res.writeHead(400, { 'Content-Type': 'text/plain' });
  res.end('Invalid Content-Type');
  return;
}
```

---

## 🚀 推荐使用方案

### 方案选择

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 开发/调试 | 原始 HTTP 服务器 | 可以看到每个数据块，便于诊断 |
| 生产环境 | 原始 HTTP 服务器 | 最可靠，性能最好 |
| 集成前端 | Next.js API | 统一在一个服务中 |

### 最终建议

**使用原始 HTTP 服务器**，因为：
1. ✅ 完全解决分包问题
2. ✅ 性能最好（无中间件开销）
3. ✅ 调试信息最详细
4. ✅ 代码简单，易维护

---

## 📝 启动命令对比

```bash
# 旧方式（Express，有分包问题）
npm run monitor:streams

# 方式 2（Next.js，通常可靠）
npm run dev

# 方式 3（原始 HTTP，最可靠）★ 推荐
npm run webhook:raw
```

---

## ✅ 验证清单

- [x] 创建原始 HTTP 服务器
- [x] 手动处理 TCP 分包
- [x] 添加详细日志（显示每个数据块）
- [x] 从 Headers 提取区块信息
- [x] 处理 V2/V3 事件
- [x] 添加错误处理
- [x] 添加健康检查
- [x] 添加 npm script
- [x] 创建文档

---

## 🎊 总结

这是**终极解决方案**！

✅ **问题**: TCP 分包导致数据丢失  
✅ **方案**: 手动监听 `data` 事件累积数据  
✅ **结果**: 完全可靠，支持任意大小的数据包  

**现在启动服务器**: `npm run webhook:raw` 🚀

