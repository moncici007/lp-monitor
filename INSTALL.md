# 安装指南

本指南将帮助您从零开始安装和配置BSC流动性池监控系统。

## 系统要求

- **操作系统**: Linux / macOS / Windows
- **Node.js**: 18.0.0 或更高版本
- **PostgreSQL**: 14.0 或更高版本
- **内存**: 至少 2GB RAM
- **存储**: 至少 10GB 可用空间

## 安装步骤

### 1. 安装Node.js

#### macOS (使用Homebrew)
```bash
brew install node
```

#### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Windows
从 [nodejs.org](https://nodejs.org/) 下载并安装。

验证安装：
```bash
node -v
npm -v
```

### 2. 安装PostgreSQL

#### macOS (使用Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
从 [postgresql.org](https://www.postgresql.org/download/windows/) 下载并安装。

### 3. 配置PostgreSQL

创建数据库和用户：

```bash
# 切换到postgres用户
sudo -u postgres psql

# 在PostgreSQL提示符下执行：
CREATE DATABASE lp_monitor;
CREATE USER lp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE lp_monitor TO lp_user;
\q
```

### 4. 克隆/下载项目

如果您有Git：
```bash
git clone <repository-url>
cd lp-monitor
```

或者直接解压项目文件到目录。

### 5. 安装项目依赖

```bash
npm install
```

### 6. 配置环境变量

复制示例配置文件：
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：
```bash
# 数据库连接字符串
DATABASE_URL=postgresql://lp_user:your_password@localhost:5432/lp_monitor

# BSC RPC节点（已提供）
BSC_RPC_URL=https://summer-solemn-pond.bsc.quiknode.pro/2d7c7a259ea0c4de731c3fad666f309c6fff111e/

# 其他配置保持默认即可
```

**重要**: 请将 `your_password` 替换为您在步骤3中设置的实际密码。

### 7. 初始化数据库

执行数据库Schema脚本：

```bash
psql -d lp_monitor -U lp_user -f src/db/schema.sql
```

如果提示输入密码，输入您在步骤3中设置的密码。

验证表是否创建成功：
```bash
psql -d lp_monitor -U lp_user -c "\dt"
```

应该看到以下表：
- tokens
- pairs
- transactions
- liquidity_events
- sync_events
- analytics
- alerts
- monitor_state

### 8. 测试数据库连接

创建测试脚本 `test-db.js`：
```javascript
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ 数据库连接成功！');
    console.log('   当前时间:', res.rows[0].now);
    await pool.end();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

test();
```

运行测试：
```bash
node test-db.js
```

### 9. 启动监控服务

在一个终端窗口中：
```bash
npm run monitor
```

您应该看到类似以下输出：
```
🚀 BSC流动性池监控系统启动中...
✅ 数据库连接成功
✅ BSC连接成功
   网络: bsc (Chain ID: 56)
   当前区块: 12345678
✅ Factory监听器启动成功
✅ 监控系统启动成功！
```

### 10. 启动Web界面

在另一个终端窗口中：
```bash
npm run dev
```

访问 http://localhost:3000 查看监控界面。

## 常见问题

### Q: 数据库连接失败

**A**: 检查以下几点：
1. PostgreSQL服务是否运行：`sudo systemctl status postgresql`
2. 数据库用户和密码是否正确
3. `.env.local` 中的 `DATABASE_URL` 是否正确
4. 防火墙是否允许连接

### Q: BSC连接失败

**A**: 
1. 检查网络连接
2. 验证RPC URL是否有效
3. 尝试使用公共RPC：`https://bsc-dataseed.binance.org/`

### Q: 端口已被占用

**A**: 
- Next.js默认使用3000端口，可以使用 `PORT=3001 npm run dev` 更改
- 或者关闭占用端口的程序

### Q: 监控服务没有检测到交易对

**A**: 
1. 确保Factory监听器正常启动
2. 等待新的交易对创建（可能需要一些时间）
3. 检查RPC节点是否正常工作
4. 查看日志输出是否有错误

### Q: 内存使用过高

**A**: 
1. 减少同时监听的交易对数量
2. 定期清理历史数据
3. 增加服务器内存

## 生产环境部署

### 使用PM2管理进程

安装PM2：
```bash
npm install -g pm2
```

创建 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [
    {
      name: 'lp-monitor',
      script: 'src/monitor/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'lp-web',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

启动服务：
```bash
# 构建Next.js应用
npm run build

# 启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 设置开机自启
pm2 startup
pm2 save
```

### Nginx反向代理

配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 维护建议

1. **定期备份数据库**
   ```bash
   pg_dump -U lp_user lp_monitor > backup_$(date +%Y%m%d).sql
   ```

2. **监控日志文件大小**
   使用logrotate或定期清理日志

3. **清理历史数据**
   定期删除较早的交易记录和事件

4. **更新依赖**
   ```bash
   npm update
   npm audit fix
   ```

## 获取帮助

如遇到问题：
1. 查看日志输出
2. 检查 `monitor.log` 文件
3. 在GitHub提交Issue
4. 查看项目README.md

## 下一步

- 查看 [README.md](README.md) 了解详细功能
- 浏览Web界面熟悉各个功能
- 配置警报通知（可选）
- 接入Telegram机器人（可选）

