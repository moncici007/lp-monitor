# QuickNode Streams 配置指南

本指南将帮助您配置和使用 QuickNode Streams 来解决 RPC 速率限制问题。

## 为什么使用 Streams？

### 传统方式的问题
```
❌ 每个交易对需要4个事件过滤器 (Swap, Mint, Burn, Sync)
❌ 100个交易对 = 400个过滤器创建请求
❌ 触发 QuickNode "15请求/秒" 限制
```

### Streams 方式的优势
```
✅ 服务端监听，不占用您的 RPC 配额
✅ 支持监听数百个合约地址
✅ Webhook 推送，实时性好 (<1秒)
✅ 可以过滤特定事件，减少数据传输
```

## 配置步骤

### 第1步：在 QuickNode Dashboard 创建 Stream

1. **登录 QuickNode**
   - 访问 https://dashboard.quicknode.com
   - 登录您的账户

2. **进入 Streams 页面**
   - 在左侧菜单点击 "Streams"
   - 点击 "Create Stream" 按钮

3. **配置 Stream**

   **基本信息：**
   - Name: `BSC LP Monitor Stream`
   - Network: `BSC Mainnet`
   - Dataset: `Logs`
   - Region: `USA East` (或选择离您最近的区域)

   **过滤器配置：**
   ```json
   {
     "filter_config": {
       "type": "logs",
       "addresses": [],
       "topics": [
         "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
         "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
         "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",
         "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
       ]
     }
   }
   ```

   **事件说明：**
   - `0xc42079...` - Swap (交易事件)
   - `0x4c209b...` - Mint (添加流动性)
   - `0xdccd41...` - Burn (移除流动性)
   - `0x1c411e...` - Sync (价格同步)

   **目标配置：**
   - Destination Type: `Webhook`
   - Webhook URL: `http://您的服务器IP:3001/streams/webhook`
     - 如果是本地测试，使用 ngrok 暴露端口（见下文）

4. **创建完成**
   - 点击 "Create" 创建 Stream
   - 记录生成的 **Stream ID**

5. **获取 API Key**
   - 进入 "API Keys" 页面
   - 创建新的 API Key 或使用已有的
   - 记录 API Key

### 第2步：配置环境变量

编辑 `.env.local` 文件，添加：

```bash
# QuickNode Streams 配置
QUICKNODE_STREAM_ID=your_stream_id_here
QUICKNODE_API_KEY=your_api_key_here
WEBHOOK_PORT=3001
```

**替换说明：**
- `your_stream_id_here` - 替换为第1步记录的 Stream ID
- `your_api_key_here` - 替换为您的 QuickNode API Key
- `WEBHOOK_PORT` - Webhook 服务器端口（默认 3001）

### 第3步：安装依赖

```bash
npm install
```

新增的依赖：
- `express` - Webhook 服务器
- `axios` - QuickNode API 调用
- `body-parser` - 解析 Webhook 数据

### 第4步：本地测试（使用 ngrok）

如果您在本地环境测试，需要使用 ngrok 暴露端口：

1. **安装 ngrok**
   ```bash
   # macOS
   brew install ngrok
   
   # 或从官网下载
   # https://ngrok.com/download
   ```

2. **启动 ngrok**
   ```bash
   ngrok http 3001
   ```

3. **获取公网 URL**
   ```
   Forwarding  https://xxxx-xxx-xxx-xxx.ngrok.io -> http://localhost:3001
   ```

4. **更新 Stream Webhook URL**
   - 回到 QuickNode Dashboard
   - 编辑您的 Stream
   - 将 Webhook URL 改为：`https://xxxx-xxx-xxx-xxx.ngrok.io/streams/webhook`

### 第5步：启动系统

```bash
# 启动 Streams 模式的监控服务
npm run monitor:streams
```

您应该看到：

```
🚀 BSC流动性池监控系统启动中... (Streams 模式)
✅ 数据库连接成功
✅ BSC连接成功
✅ Webhook 服务器启动成功
   监听端口: 3001
   Webhook URL: http://localhost:3001/streams/webhook
✅ Factory监听器启动成功
✅ Stream 配置更新成功
✅ 监控系统启动成功！（Streams 模式）
```

## 验证配置

### 1. 检查 Webhook 服务器

```bash
curl http://localhost:3001/health
```

应返回：
```json
{
  "status": "ok",
  "timestamp": "2024-11-24T..."
}
```

### 2. 检查 Stream 状态

在 QuickNode Dashboard 中：
- 查看 Stream 状态应该是 `Active` 或 `Running`
- 查看 "Recent Activity" 应该有数据流入

### 3. 查看日志

监控服务会打印：
```
📨 收到 Streams Webhook 数据
   处理 X 条日志...
💱 Swap: 0x123abc... | 0xdef456...
➕ Mint: 0x789ghi...
✅ 处理完成，共 X 条日志
```

## 工作原理

```
┌─────────────────────┐
│ QuickNode Streams   │
│ (服务端监听区块链)  │
└──────────┬──────────┘
           │ 过滤事件
           ↓
┌─────────────────────┐
│   Webhook 推送      │
│  (HTTP POST)        │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ 您的 Webhook 服务器 │
│ (端口 3001)         │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   事件处理器        │
│ (解析并保存到数据库)│
└─────────────────────┘
```

## 常见问题

### Q1: Webhook 没有收到数据？

**检查：**
1. Stream 状态是否为 `Active`
2. Webhook URL 是否正确（公网可访问）
3. 是否有新的交易对创建（触发事件）
4. 防火墙是否允许入站连接

**测试 Webhook：**
```bash
curl -X POST http://localhost:3001/streams/webhook \
  -H "Content-Type: application/json" \
  -d '[{"logs":[]}]'
```

### Q2: Stream 地址列表如何更新？

**自动更新：**
- 每当 Factory 检测到新交易对时自动更新
- 每30分钟定时同步一次

**手动更新：**
系统会自动调用 `updateStreamAddresses()` 函数

### Q3: 可以监听多少个交易对？

**QuickNode Streams 限制：**
- 免费版：通常支持 50-100 个地址
- 付费版：可支持 1000+ 个地址
- 具体以您的套餐为准

**当前配置：**
- 系统会监听最近的 200 个交易对
- 可以在代码中调整数量

### Q4: RPC 速率限制问题解决了吗？

**完全解决！**

**传统方式：**
```
您的服务器 --[每秒40个请求]--> QuickNode RPC ❌
```

**Streams 方式：**
```
QuickNode Streams --[Webhook推送]--> 您的服务器 ✅
```

- Streams 不占用您的 RPC 配额
- Factory 监听器只需要 4 个过滤器（可接受）
- 所有 Pair 事件通过 Streams 推送（无限制）

### Q5: 延迟有多大？

**实测延迟：**
- 事件发生到推送: < 1 秒
- 与直接监听几乎一样快

### Q6: 需要付费吗？

**取决于用量：**
- QuickNode 免费版包含一定的 Streams 配额
- 大量数据推送可能需要升级套餐
- 具体查看：https://dashboard.quicknode.com/billing/plan

## 生产环境部署

### 使用固定域名

不要使用 ngrok（它会变化），而是：

1. **配置 Nginx 反向代理**
   ```nginx
   server {
       listen 80;
       server_name webhooks.yourdomain.com;
       
       location /streams/webhook {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **配置 SSL (Let's Encrypt)**
   ```bash
   sudo certbot --nginx -d webhooks.yourdomain.com
   ```

3. **更新 Stream Webhook URL**
   ```
   https://webhooks.yourdomain.com/streams/webhook
   ```

### 使用 PM2 管理

```bash
pm2 start npm --name "lp-monitor-streams" -- run monitor:streams
pm2 save
```

## 监控和维护

### 查看 Stream 统计

```javascript
// 可以添加到代码中
const { getStreamInfo } = require('./src/monitor/streams/streamManager');

const info = await getStreamInfo();
console.log('Stream 统计:', info);
```

### 重启 Stream

如果 Stream 出现问题：

```javascript
const { pauseStream, startStream } = require('./src/monitor/streams/streamManager');

await pauseStream();
await new Promise(r => setTimeout(r, 5000));
await startStream();
```

## 参考资源

- [QuickNode Streams 官方文档](https://www.quicknode.com/guides/quicknode-products/streams/how-to-use-filters-with-streams)
- [QuickNode API 文档](https://www.quicknode.com/docs/streams)
- [ngrok 文档](https://ngrok.com/docs)

## 获取帮助

如遇到问题：
1. 检查 QuickNode Dashboard 的 Stream 日志
2. 查看本地 Webhook 服务器日志
3. 在 GitHub 提交 Issue
4. 联系 QuickNode 支持

---

**恭喜！您现在可以监控 100+ 个交易对而不受 RPC 限制了！** 🎉

