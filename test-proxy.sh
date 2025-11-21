#!/bin/bash

# 测试代理配置脚本

echo "🔍 LP Monitor 代理测试工具"
echo "================================"
echo ""

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 检查代理配置
echo "📋 代理配置:"
echo "HTTP_PROXY: ${HTTP_PROXY:-未设置}"
echo "HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
echo ""

# 测试 BSC RPC
echo "🔷 测试 BSC RPC 节点..."
echo "RPC URL: ${BSC_RPC_URL}"
echo ""

if [ -n "$HTTP_PROXY" ]; then
    echo "通过代理 $HTTP_PROXY 连接..."
    RESULT=$(curl -x "$HTTP_PROXY" \
        -X POST \
        -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$BSC_RPC_URL" \
        --max-time 10 \
        -s 2>&1)
else
    echo "直接连接..."
    RESULT=$(curl \
        -X POST \
        -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$BSC_RPC_URL" \
        --max-time 10 \
        -s 2>&1)
fi

if echo "$RESULT" | grep -q "result"; then
    BLOCK=$(echo "$RESULT" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    DECIMAL_BLOCK=$((16#${BLOCK:2}))
    echo "✅ BSC 连接成功！"
    echo "   当前区块: $DECIMAL_BLOCK (0x${BLOCK:2})"
else
    echo "❌ BSC 连接失败"
    echo "   错误: $RESULT"
fi

echo ""
echo "================================"

# 测试 Solana RPC
echo "🟣 测试 Solana RPC 节点..."
echo "RPC URL: ${SOLANA_RPC_URL}"
echo ""

if [ -n "$HTTP_PROXY" ]; then
    echo "通过代理 $HTTP_PROXY 连接..."
    RESULT=$(curl -x "$HTTP_PROXY" \
        -X POST \
        -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
        "$SOLANA_RPC_URL" \
        --max-time 10 \
        -s 2>&1)
else
    echo "直接连接..."
    RESULT=$(curl \
        -X POST \
        -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
        "$SOLANA_RPC_URL" \
        --max-time 10 \
        -s 2>&1)
fi

if echo "$RESULT" | grep -q "solana-core"; then
    VERSION=$(echo "$RESULT" | grep -o '"solana-core":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Solana 连接成功！"
    echo "   版本: $VERSION"
else
    echo "❌ Solana 连接失败"
    echo "   错误: $RESULT"
fi

echo ""
echo "================================"
echo "✅ 测试完成！"
echo ""
echo "💡 提示:"
echo "  - 如果连接成功，可以运行: npm run monitor"
echo "  - 如果连接失败，检查代理设置或使用备用节点"
echo "  - 查看 PROXY_SETUP.md 了解详细配置说明"

