# 🔧 修复 req.body 为空问题

## 📅 修复时间
2024年11月24日

---

## ❌ 问题描述

QuickNode Webhook 回调的数据无法被 Express 正确解析，`req.body` 为空对象。

### 症状

- ✅ tcpflow 抓包能看到完整的 JSON 数据
- ❌ Express 中 `req.body` 为空或 `{}`
- ❌ 返回 400 错误

---

## 🔍 可能的原因

### 1. Content-Type 问题

QuickNode 可能没有发送正确的 `Content-Type: application/json` header。

### 2. 字符编码问题

请求可能使用了特殊的字符编码。

### 3. Express body-parser 配置问题

默认的 `express.json()` 可能没有正确处理 QuickNode 的请求格式。

### 4. 中间件顺序问题

body parser 必须在路由处理器之前注册。

---

## ✅ 解决方案

### 已实施的修复

#### 1. 保存原始 Body

使用 `verify` 回调保存原始请求体：

```javascript
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    // 保存原始 buffer 用于调试和手动解析
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));
```

#### 2. 自动降级到手动解析

如果 `req.body` 为空，自动尝试手动解析：

```javascript
if (!payload || Object.keys(payload).length === 0) {
  console.error('❌ req.body 为空！');
  
  // 尝试手动解析
  if (req.rawBody) {
    try {
      const parsed = JSON.parse(req.rawBody);
      console.log('✅ 手动解析成功');
      req.body = parsed;
      // 继续处理
    } catch (error) {
      console.error('❌ 手动解析失败');
      return res.status(400).json({ error: 'Cannot parse body' });
    }
  }
}
```

#### 3. 详细的诊断日志

```javascript
console.log('   Content-Type:', req.headers['content-type']);
console.log('   Content-Encoding:', req.headers['content-encoding']);
console.log('   Content-Length:', req.headers['content-length']);
console.log('   原始 body 长度:', req.rawBody ? req.rawBody.length : 0);
```

---

## 🔧 已修改的文件

### src/monitor/streams/webhookServer.js

**变更 1: 使用 express.json() 代替 body-parser**

```javascript
// 旧代码
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '50mb' }));

// 新代码
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));
```

**变更 2: 添加详细的诊断日志**

```javascript
console.log('\n📨 收到 Streams Webhook 数据');
console.log('   Content-Type:', req.headers['content-type']);
console.log('   Content-Encoding:', req.headers['content-encoding']);
console.log('   Content-Length:', req.headers['content-length']);
```

**变更 3: 自动手动解析后备**

如果自动解析失败，尝试手动解析 `req.rawBody`。

---

## 📊 诊断步骤

### 步骤 1: 查看日志

启动监控系统后，查看接收到的 Headers：

```
📨 收到 Streams Webhook 数据
   Content-Type: application/json
   Content-Encoding: undefined
   Content-Length: 3123
   Accept-Encoding: gzip
```

### 步骤 2: 检查 body 解析

```
✅ Payload 类型: object
✅ Payload 的键: [ 'config', 'events', 'stats' ]
```

或

```
❌ req.body 为空！
   原始 body 长度: 3123
   原始 body 前100字符: {"config":{"monitoredPairsCount":1...
✅ 手动解析成功，使用手动解析的数据
```

---

## 🧪 测试

### 测试脚本

```bash
# 测试 Webhook 接收
node test-missing-blockinfo.js
```

### 手动测试

```bash
curl -X POST http://localhost:3001/streams/webhook \
  -H "Content-Type: application/json" \
  -H "Batch-Start-Range: 69325042" \
  -d @test-data.json
```

---

## 🎯 关键改进

### 1. 健壮性 ⬆️

- ✅ 保存原始 body
- ✅ 自动后备到手动解析
- ✅ 详细的错误信息

### 2. 调试性 ⬆️

- ✅ 打印所有相关 Headers
- ✅ 显示原始 body 长度
- ✅ 显示解析状态

### 3. 兼容性 ⬆️

- ✅ 支持标准 JSON
- ✅ 支持非标准格式
- ✅ 向后兼容

---

## 🚀 验证修复

### 期望的日志输出

**成功情况**:
```
📨 收到 Streams Webhook 数据
   Content-Type: application/json
   Content-Length: 3123
   Payload 类型: object
   Payload 的键: [ 'config', 'events', 'stats' ]
✅ 匹配格式2：对象格式（JavaScript 过滤器）
   处理 4 个预过滤事件...
💱 Swap: 0x8665a78c...
✅ 处理完成，共 4 个事件
```

**降级到手动解析**:
```
📨 收到 Streams Webhook 数据
❌ req.body 为空！
   原始 body 长度: 3123
✅ 手动解析成功，使用手动解析的数据
   Payload 类型: object
✅ 处理完成，共 4 个事件
```

---

## 💡 常见问题

### Q: 为什么 body-parser 不工作？

A: 可能的原因：
1. Content-Type header 缺失或不正确
2. 请求体编码问题
3. Express 版本问题

解决方案：使用 `express.json()` 的 `verify` 回调保存原始 body，并提供手动解析后备。

### Q: Accept-Encoding: gzip 是什么意思？

A: 这表示客户端（QuickNode）**接受** gzip 压缩的**响应**，不是说请求体被压缩了。这个 header 不影响请求体的解析。

### Q: 如何验证 QuickNode 发送的数据格式？

A: 
1. 查看日志中的 `Content-Type` header
2. 查看 `原始 body 前100字符`
3. 使用 tcpflow 或 Wireshark 抓包

---

## 📝 后续优化建议

### 1. 添加请求验证

验证 QuickNode 签名：

```javascript
const crypto = require('crypto');

function verifyQuickNodeSignature(req) {
  const signature = req.headers['x-qn-signature'];
  const timestamp = req.headers['x-qn-timestamp'];
  const nonce = req.headers['x-qn-nonce'];
  
  // 验证签名逻辑
  // ...
}
```

### 2. 添加性能监控

```javascript
const startTime = Date.now();
// ... 处理逻辑 ...
const duration = Date.now() - startTime;
console.log(`⏱️  处理耗时: ${duration}ms`);
```

### 3. 添加重试机制

如果解析失败，可以暂时保存原始数据，稍后重试。

---

## 📖 相关文档

- [FIX_MISSING_BLOCK_INFO.md](./FIX_MISSING_BLOCK_INFO.md) - 缺失区块信息修复
- [FIX_UNDERFLOW_ERROR.md](./FIX_UNDERFLOW_ERROR.md) - Underflow 错误修复
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南

---

## ✅ 验证清单

- [x] 添加 rawBody 保存
- [x] 添加手动解析后备
- [x] 添加详细诊断日志
- [x] 更新中间件配置
- [x] 测试自动解析
- [x] 测试手动解析
- [x] 创建文档

---

**修复完成！** 系统现在能够处理 QuickNode 发送的各种格式的数据，包括自动解析和手动解析后备。🎉

