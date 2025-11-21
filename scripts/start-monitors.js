require('dotenv').config();
const BSCMonitor = require('../lib/monitors/bsc-monitor');
const SolanaMonitor = require('../lib/monitors/solana-monitor');

// 解析池子地址
function parsePoolAddresses(envVar) {
  if (!envVar) return [];
  return envVar.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
}

async function main() {
  console.log('🚀 LP Monitor 启动中...\n');
  console.log('='.repeat(60));
  
  // 检查必需的环境变量
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }
  
  const bscPoolAddresses = parsePoolAddresses(process.env.BSC_POOL_ADDRESSES);
  const solanaPoolAddresses = parsePoolAddresses(process.env.SOLANA_POOL_ADDRESSES);
  
  console.log(`\n📋 配置信息:`);
  console.log(`  BSC 池子数量: ${bscPoolAddresses.length}`);
  console.log(`  Solana 池子数量: ${solanaPoolAddresses.length}`);
  console.log('');
  
  if (bscPoolAddresses.length === 0 && solanaPoolAddresses.length === 0) {
    console.error('❌ 错误: 未配置任何池子地址');
    console.log('\n请在 .env 文件中设置 BSC_POOL_ADDRESSES 或 SOLANA_POOL_ADDRESSES');
    process.exit(1);
  }
  
  const monitors = [];
  
  // 启动 BSC 监控
  if (bscPoolAddresses.length > 0) {
    console.log('='.repeat(60));
    console.log('🔷 BSC 监控');
    console.log('='.repeat(60));
    
    const bscMonitor = new BSCMonitor();
    try {
      await bscMonitor.start(bscPoolAddresses);
      monitors.push({ name: 'BSC', monitor: bscMonitor });
    } catch (error) {
      console.error('❌ BSC 监控启动失败:', error.message);
    }
  }
  
  // 启动 Solana 监控
  if (solanaPoolAddresses.length > 0) {
    console.log('='.repeat(60));
    console.log('🟣 Solana 监控');
    console.log('='.repeat(60));
    
    const solanaMonitor = new SolanaMonitor();
    try {
      await solanaMonitor.start(solanaPoolAddresses);
      monitors.push({ name: 'Solana', monitor: solanaMonitor });
    } catch (error) {
      console.error('❌ Solana 监控启动失败:', error.message);
    }
  }
  
  if (monitors.length === 0) {
    console.error('\n❌ 没有监控服务成功启动');
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('✅ 所有监控服务已启动');
  console.log('='.repeat(60));
  console.log('\n💡 提示: 按 Ctrl+C 停止监控\n');
  
  // 优雅退出处理
  let isShuttingDown = false;
  
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`\n\n收到 ${signal} 信号，正在关闭监控服务...\n`);
    
    for (const { name, monitor } of monitors) {
      try {
        console.log(`⏹️  停止 ${name} 监控...`);
        await monitor.stop();
      } catch (error) {
        console.error(`停止 ${name} 监控失败:`, error.message);
      }
    }
    
    // 关闭数据库连接
    try {
      const { closePool } = require('../lib/db');
      await closePool();
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接失败:', error.message);
    }
    
    console.log('\n👋 再见！\n');
    process.exit(0);
  };
  
  // 监听退出信号
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // 监听未捕获的异常
  process.on('unhandledRejection', (error) => {
    console.error('未处理的 Promise 拒绝:', error);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    shutdown('uncaughtException');
  });
}

// 启动
main().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});

