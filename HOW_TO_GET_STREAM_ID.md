# 如何获取正确的 QuickNode Stream ID

## 方法 1：从 Dashboard 获取 (推荐)

1. **打开 QuickNode Streams Dashboard**
   ```
   https://dashboard.quicknode.com/streams
   ```

2. **找到您创建的 Stream**
   - 在列表中应该能看到您的 Stream
   - 可能显示为 "BSC Monitoring" 或您创建时的名称

3. **点击 Stream 查看详情**
   - 点击 Stream 名称进入详情页面

4. **复制 Stream ID**
   - 在详情页面顶部，应该能看到 Stream ID
   - **正确的格式应该类似于**: `st_abcd1234efgh5678` （以 `st_` 开头）
   - 或者在 URL 中也能看到 Stream ID：
     ```
     https://dashboard.quicknode.com/streams/st_xxxxxxxxxxxxx
                                               ^^^^^^^^^^^^^^^^
                                               这就是 Stream ID
     ```

5. **更新 .env 文件**
   ```bash
   QUICKNODE_STREAM_ID=st_xxxxxxxxxxxxx  # 替换为您的实际 ID
   ```

## 方法 2：使用 API 列出所有 Streams

如果您在 Dashboard 中找不到，可以使用以下命令列出所有 Streams：

```bash
curl -X GET "https://api.quicknode.com/streams/rest/v1/streams" \
  -H "x-api-key: QN_4c0e978dc96c4cc4b92a633ca77d6876"
```

这会返回您账户下所有的 Streams，包括它们的 ID。

## 常见问题

### Q: 我在哪里可以找到 API Key?

A: 在 QuickNode Dashboard:
1. 点击右上角的用户头像
2. 选择 "API Keys"
3. 如果没有，点击 "Create API Key"
4. 确保勾选 "Streams" 权限

### Q: Stream ID 的格式是什么?

A: QuickNode Stream ID 通常是：
- **格式**: `st_` + 字母数字组合
- **示例**: `st_1a2b3c4d5e6f7890`
- **长度**: 通常 18-20 个字符

### Q: 我的 Stream ID 看起来像 UUID (带连字符的)，这正常吗?

A: 不正常。如果您看到的是 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` 格式：
- 这可能是 Stream 的内部 UUID，不是 API 用的 Stream ID
- 请确保您复制的是 "Stream ID" 字段，而不是其他字段

## 验证配置

更新 .env 后，运行以下命令验证：

```bash
node verify-stream-config.js
```

如果配置正确，您应该看到：

```
✅ Stream 验证成功！

Stream 详情:
------------------------------------------------------------
ID: st_xxxxxxxxxxxxx
名称: BSC Monitoring
状态: active 或 paused
...
```

