# 问题排查指南

## 🔍 Webhook 收到"未识别的数据格式"错误

### 问题现象

```
❌ 未识别的数据格式
```

### 可能的原因

#### 1. 服务未重启

**检查方法：**
```bash
# 停止旧服务
# Ctrl+C 或 kill 进程

# 重新启动
npm run monitor:streams
```

#### 2. body-parser 未安装

**检查方法：**
```bash
# 查看 package.json 中是否有 body-parser
grep "body-parser" package.json

# 重新安装依赖
npm install
```

#### 3. 代码未正确更新

**检查方法：**
```bash
# 查看 webhookServer.js 的内容
head -n 50 src/monitor/streams/webhookServer.js

# 应该看到 handleFilteredEvents 导入
```

#### 4. JSON 解析问题

**检查方法：**
使用测试脚本验证：
```bash
node test-webhook.js
```

### 详细排查步骤

#### 步骤1：确认服务正在运行

```bash
# 检查服务是否运行
curl http://localhost:3001/health

# 应该返回
{"status":"ok","timestamp":"..."}
```

#### 步骤2：查看详细日志

重启服务后，再次触发 webhook，您应该看到：

```
📨 收到 Streams Webhook 数据
   Payload 类型: object
   是否为数组: false
   Payload 的键: [ 'config', 'events', 'stats' ]
   有 events 属性: true
   events 是数组: true
   ✅ 匹配格式2：对象格式（JavaScript 过滤器）
   统计: {
     "totalBlocks": 1,
     ...
   }
   处理 2 个预过滤事件...
✅ 处理完成，共 2 个事件
```

#### 步骤3：使用测试脚本

```bash
# 确保服务正在运行
npm run monitor:streams

# 在另一个终端运行测试
node test-webhook.js
```

#### 步骤4：检查端口占用

```bash
# macOS/Linux
lsof -i :3001

# 或者
netstat -an | grep 3001
```

### 常见解决方案

#### 解决方案1：完全重启

```bash
# 1. 停止所有相关进程
pkill -f "monitor:streams"
pkill -f "node.*webhook"

# 2. 清理 node_modules（可选）
rm -rf node_modules
npm install

# 3. 重新启动
npm run monitor:streams
```

#### 解决方案2：检查环境变量

```bash
# 确认 .env.local 存在
ls -la .env.local

# 查看内容
cat .env.local
```

#### 解决方案3：手动测试 body-parser

创建测试文件 `test-bodyparser.js`：

```javascript
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/test', (req, res) => {
  console.log('Body:', req.body);
  console.log('Type:', typeof req.body);
  console.log('Keys:', Object.keys(req.body));
  res.json({ received: true });
});

app.listen(3002, () => {
  console.log('Test server on port 3002');
});
```

运行测试：
```bash
node test-bodyparser.js

# 在另一个终端
curl -X POST http://localhost:3002/test \
  -H "Content-Type: application/json" \
  -d '{"events": [1,2,3]}'
```

## 🐛 其他常见问题

### 问题：Cannot find module 'body-parser'

**解决方案：**
```bash
npm install body-parser --save
```

### 问题：Port 3001 already in use

**解决方案：**
```bash
# 查找占用端口的进程
lsof -ti:3001

# 杀死进程
kill -9 $(lsof -ti:3001)

# 或者使用不同端口
WEBHOOK_PORT=3002 npm run monitor:streams
```

### 问题：数据库连接失败

**检查：**
```bash
# 测试数据库连接
psql "postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor" -c "SELECT 1;"
```

### 问题：事件未保存到数据库

**检查：**
1. 数据库表是否创建
```bash
psql "postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor" -c "\dt"
```

2. 检查事件签名是否匹配（V2 vs V3）
```bash
# 查看您的数据中的 topics[0]
# V2: 0xc42079...
# V3: 0xd78ad9...
```

## 📊 日志分析

### 正常的日志输出

```
📨 收到 Streams Webhook 数据
   Payload 类型: object
   是否为数组: false
   Payload 的键: [ 'config', 'events', 'stats' ]
   有 events 属性: true
   events 是数组: true
   ✅ 匹配格式2：对象格式（JavaScript 过滤器）
   统计: { ... }
   处理 4 个预过滤事件...
💱 Swap: 0x8665a7... | 0x7c5620...
🔄 Sync: 0x8665a7... 
✅ 处理完成，共 4 个事件
```

### 异常的日志输出

```
❌ 未识别的数据格式
   Payload 示例: ...
```

如果看到这个，检查 "Payload 示例" 的内容。

## 🔧 完整的诊断流程

```bash
# 1. 停止服务
# Ctrl+C

# 2. 检查依赖
npm install

# 3. 检查数据库
psql "postgresql://postgres:lp-monitor@127.0.0.1:5432/lp_monitor" -c "SELECT NOW();"

# 4. 重启服务
npm run monitor:streams

# 5. 在另一个终端测试
node test-webhook.js

# 6. 查看日志输出
```

## 📞 获取帮助

如果问题仍未解决：

1. **收集信息：**
   - Node.js 版本：`node -v`
   - npm 版本：`npm -v`
   - 操作系统：`uname -a`
   - 错误日志的完整输出

2. **提供日志：**
   ```bash
   npm run monitor:streams 2>&1 | tee monitor.log
   ```

3. **测试结果：**
   ```bash
   node test-webhook.js > test.log 2>&1
   ```

---

**常见问题已解决？** 如果还有问题，请提供完整的日志输出。

