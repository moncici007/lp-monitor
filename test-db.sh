#!/bin/bash

echo "🔍 测试数据库连接..."
echo ""

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
fi

echo "📋 数据库连接信息:"
echo "DATABASE_URL: ${DATABASE_URL}"
echo ""

echo "🔌 尝试连接..."
psql "$DATABASE_URL" -c "SELECT 
    'Connection OK' as status,
    version() as postgres_version,
    current_database() as database,
    current_user as user;" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库连接成功！"
    echo ""
    echo "📊 检查表..."
    psql "$DATABASE_URL" -c "\dt" 2>&1
else
    echo ""
    echo "❌ 数据库连接失败"
    echo ""
    echo "💡 可能的原因:"
    echo "  1. 密码不正确"
    echo "  2. PostgreSQL 服务未启动"
    echo "  3. 主机地址不正确"
    echo "  4. 数据库不存在"
    echo ""
    echo "💡 尝试手动连接:"
    echo "  psql -h 127.0.0.1 -U postgres -d lp_monitor"
fi
