#!/bin/bash

# BSC流动性池监控系统 - 启动脚本

echo "======================================"
echo "  BSC流动性池监控系统"
echo "======================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先安装Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  未找到psql命令，请确保PostgreSQL已安装"
fi

# 检查.env.local文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到.env.local文件，正在从示例文件创建..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ 已创建.env.local文件，请编辑此文件配置数据库连接"
        echo ""
        read -p "按Enter键继续..."
    else
        echo "❌ 未找到.env.example文件"
        exit 1
    fi
fi

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖包安装失败"
        exit 1
    fi
fi

echo ""
echo "选择启动模式："
echo "1. 启动监控服务（区块链监听）"
echo "2. 启动Web界面"
echo "3. 同时启动监控服务和Web界面（推荐）"
echo ""
read -p "请选择 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 启动监控服务..."
        npm run monitor
        ;;
    2)
        echo ""
        echo "🌐 启动Web界面..."
        npm run dev
        ;;
    3)
        echo ""
        echo "🚀 同时启动监控服务和Web界面..."
        echo ""
        echo "监控服务将在后台运行..."
        npm run monitor > monitor.log 2>&1 &
        MONITOR_PID=$!
        echo "✅ 监控服务已启动 (PID: $MONITOR_PID)"
        echo "📝 日志输出到: monitor.log"
        echo ""
        sleep 2
        echo "🌐 启动Web界面..."
        npm run dev
        ;;
    *)
        echo "❌ 无效的选择"
        exit 1
        ;;
esac

