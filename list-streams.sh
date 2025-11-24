#!/bin/bash

# 列出所有 QuickNode Streams

echo "🔍 正在查询您的 QuickNode Streams..."
echo ""

# 从 .env 加载 API Key
source .env

if [ -z "$QUICKNODE_API_KEY" ]; then
  echo "❌ 错误: 未找到 QUICKNODE_API_KEY"
  echo "   请在 .env 文件中配置"
  exit 1
fi

echo "使用 API Key: ${QUICKNODE_API_KEY:0:10}..."
echo ""
echo "=" | tr '\n' '=' | head -c 60
echo ""

# 调用 API
response=$(curl -s -X GET "https://api.quicknode.com/streams/rest/v1/streams" \
  -H "x-api-key: $QUICKNODE_API_KEY" \
  -H "accept: application/json")

# 检查响应
if echo "$response" | grep -q '"id"'; then
  echo "✅ 找到以下 Streams:"
  echo ""
  
  # 使用 node 来解析 JSON (因为 bash 不好处理 JSON)
  echo "$response" | node -e '
    const data = JSON.parse(require("fs").readFileSync(0, "utf-8"));
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((stream, index) => {
        console.log(`${index + 1}. ${stream.name || "未命名"}`);
        console.log(`   ID: ${stream.id}`);
        console.log(`   状态: ${stream.status}`);
        console.log(`   网络: ${stream.network}`);
        if (stream.destination) {
          console.log(`   Webhook: ${stream.destination.url || "未配置"}`);
        }
        console.log("");
      });
      
      console.log("📝 请复制上面的 Stream ID 并更新到 .env 文件中");
    } else {
      console.log("⚠️  未找到任何 Streams");
      console.log("   请先在 QuickNode Dashboard 创建 Stream");
      console.log("   https://dashboard.quicknode.com/streams");
    }
  '
else
  echo "❌ 请求失败或未找到 Streams"
  echo ""
  echo "响应内容:"
  echo "$response"
  echo ""
  echo "可能的原因:"
  echo "  1. API Key 不正确"
  echo "  2. 网络连接问题"
  echo "  3. 还没有创建任何 Stream"
fi

echo ""
echo "=" | tr '\n' '=' | head -c 60
echo ""

