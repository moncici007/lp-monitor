# 快速开始指南

5分钟快速启动BSC流动性池监控系统！

## 前提条件检查

- ✅ Node.js 18+ 已安装
- ✅ PostgreSQL 14+ 已安装并运行
- ✅ 有可用的BSC RPC节点（已提供）

## 步骤1：安装依赖（1分钟）

```bash
cd lp-monitor
npm install
```

## 步骤2：配置环境（1分钟）

创建 `.env.local` 文件：

```bash
# 复制示例文件
cp .env.example .env.local

# 编辑文件，修改数据库连接
nano .env.local
```

**关键配置**：
```
DATABASE_URL=postgresql://用户名:密码@localhost:5432/lp_monitor
```

其他配置保持默认即可。

## 步骤3：初始化数据库（1分钟）

```bash
# 创建数据库
createdb lp_monitor

# 或使用psql
psql -U postgres -c "CREATE DATABASE lp_monitor;"

# 执行Schema
psql -d lp_monitor -f src/db/schema.sql
```

## 步骤4：启动系统（2分钟）

### 方法A：使用启动脚本（推荐）

```bash
chmod +x start.sh
./start.sh
```

选择选项3（同时启动监控和Web界面）

### 方法B：手动启动

**终端1** - 监控服务：
```bash
npm run monitor
```

**终端2** - Web界面：
```bash
npm run dev
```

## 步骤5：访问界面

打开浏览器访问：http://localhost:3000

## 验证运行

### 1. 检查监控服务

在监控服务终端应该看到：

```
✅ 数据库连接成功
✅ BSC连接成功
   网络: bsc (Chain ID: 56)
   当前区块: 36123456
✅ Factory监听器启动成功
✅ 监控系统启动成功！
```

### 2. 检查Web界面

- 首页显示统计卡片
- 可以看到"监控中的交易对"数量
- 底部显示"BSC 主网"

### 3. 等待数据

- 监控服务会实时检测新创建的交易对
- 可能需要等待几分钟才有新的交易对创建
- 也可以手动导入已有的交易对地址

## 常见问题速查

### ❌ 数据库连接失败

```bash
# 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 或 (macOS)
brew services list | grep postgresql

# 重启PostgreSQL
sudo systemctl restart postgresql
```

### ❌ 端口3000已被占用

```bash
# 使用其他端口
PORT=3001 npm run dev
```

### ❌ npm install失败

```bash
# 清理缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ⚠️ 没有检测到交易对

这是正常的！原因：
1. 新交易对创建需要时间（可能几分钟到几小时）
2. 系统正在等待PancakeSwap上新的交易对创建事件

**解决方案**：耐心等待，或者：

```javascript
// 可以扫描历史区块获取已有交易对
// 在 src/monitor/index.js 中添加：
const { scanHistoricalPairs } = require('./listeners/factoryListener');

// 启动后调用（扫描最近1000个区块）
async function loadHistoricalData() {
  const currentBlock = await provider.getBlockNumber();
  await scanHistoricalPairs(currentBlock - 1000, currentBlock);
}

// 在 startMonitoring() 函数中调用
loadHistoricalData();
```

## 测试数据库连接

创建 `test-connection.js`：

```javascript
require('dotenv').config({ path: '.env.local' });
const db = require('./src/db/client');

async function test() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ 数据库连接成功！');
    console.log('   时间:', result.rows[0].now);
    
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✅ 找到表:', tables.rows.length);
    tables.rows.forEach(row => console.log('   -', row.table_name));
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

test();
```

运行测试：
```bash
node test-connection.js
```

## 下一步

1. **浏览界面**
   - 查看仪表板统计
   - 浏览交易对列表
   - 检查警报中心

2. **了解功能**
   - 阅读 [README.md](README.md) 了解完整功能
   - 查看 [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) 了解架构

3. **自定义配置**
   - 修改大额交易阈值
   - 调整监控间隔
   - 配置警报规则

4. **生产部署**
   - 阅读 [INSTALL.md](INSTALL.md) 的生产环境部署章节
   - 使用PM2管理进程
   - 配置Nginx反向代理

## 快速命令参考

```bash
# 启动监控服务
npm run monitor

# 启动Web界面
npm run dev

# 生产构建
npm run build
npm start

# 数据库操作
npm run db:init           # 初始化数据库

# 查看数据库
psql -d lp_monitor

# 停止所有服务
# Ctrl+C 在各个终端窗口
```

## 获取帮助

- 📖 完整文档：[README.md](README.md)
- 🔧 安装指南：[INSTALL.md](INSTALL.md)  
- 🏗️ 项目架构：[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- 🐛 问题报告：GitHub Issues

## 成功标志

当您看到以下内容时，说明系统运行成功：

✅ 监控服务显示"监控系统启动成功"  
✅ Web界面可以正常访问  
✅ 首页显示统计数据（即使是0也正常）  
✅ 没有错误日志输出

**恭喜！您已成功启动BSC流动性池监控系统！** 🎉

现在您可以实时监控BSC链上PancakeSwap V2的新交易对创建和交易活动了。

