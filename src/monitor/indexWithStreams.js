#!/usr/bin/env node

require('dotenv').config();
const cron = require('node-cron');
const { testConnection } = require('../blockchain/provider');
const db = require('../db/client');
const { initFactoryListener, stopFactoryListener } = require('./listeners/factoryListener');
const { analyzeAllPairs, updateHourlyAnalytics } = require('./analyzer');
const { startWebhookServer } = require('./streams/webhookServer');
const { updateStreamAddresses, getStreamInfo, startStream } = require('./streams/streamManager');
const pairRepository = require('../db/repositories/pairRepository');

let isRunning = false;
let webhookServer = null;

// 启动监控系统（使用 Streams 方案）
async function startMonitoring() {
  if (isRunning) {
    console.log('⚠️  监控系统已在运行中');
    return;
  }

  console.log('='.repeat(60));
  console.log('🚀 BSC流动性池监控系统启动中... (Streams 模式)');
  console.log('='.repeat(60));

  try {
    // 测试数据库连接
    console.log('\n📊 测试数据库连接...');
    await db.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    // 测试BSC连接
    console.log('\n🌐 测试BSC网络连接...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('BSC网络连接失败');
    }

    // 启动 Webhook 服务器
    console.log('\n📡 启动 Webhook 服务器...');
    const webhookPort = process.env.WEBHOOK_PORT || 3001;
    webhookServer = await startWebhookServer(webhookPort);

    // 启动 Factory 监听器（只监听新交易对创建）
    console.log('\n🏭 启动 Factory 监听器...');
    await initFactoryListener();

    // 初始化 Stream 配置（如果配置了）
    if (process.env.QUICKNODE_STREAM_ID && process.env.QUICKNODE_API_KEY) {
      console.log('\n🔧 初始化 QuickNode Stream...');
      await initializeStream();
    } else {
      console.log('\n⚠️  未配置 QuickNode Streams');
      console.log('   系统将只监听 Factory 事件（新交易对创建）');
      console.log('   交易对事件（Swap/Mint/Burn/Sync）需要配置 Streams');
      console.log('   请参考 STREAMS_SETUP.md 或 ENV_SETUP_GUIDE.md');
    }

    // 设置定时任务 - 每小时分析一次所有交易对
    cron.schedule('0 * * * *', async () => {
      console.log('\n⏰ 定时任务: 开始分析所有交易对...');
      await analyzeAllPairs(100);
    });

    // 设置定时任务 - 每10分钟更新一次分析数据
    cron.schedule('*/10 * * * *', async () => {
      console.log('\n⏰ 定时任务: 更新分析数据...');
      await updateAllPairsAnalytics();
    });

    // 设置定时任务 - 每30分钟同步一次 Stream 地址
    cron.schedule('*/30 * * * *', async () => {
      console.log('\n⏰ 定时任务: 同步 Stream 地址列表...');
      await syncStreamAddresses();
    });

    // 每30秒打印状态
    setInterval(() => {
      printStatus();
    }, 30000);

    isRunning = true;

    console.log('\n' + '='.repeat(60));
    console.log('✅ 监控系统启动成功！（Streams 模式）');
    console.log('='.repeat(60));
    console.log('\n💡 提示:');
    console.log('   - 按 Ctrl+C 停止监控');
    console.log('   - Factory 监听器检测新交易对');
    console.log('   - QuickNode Streams 推送交易对事件');
    console.log('   - Webhook 接收并处理事件数据');
    console.log('   - 数据实时保存到数据库\n');
  } catch (error) {
    console.error('\n❌ 启动监控系统失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 初始化 Stream
async function initializeStream() {
  try {
    // 获取 Stream 信息
    const streamInfo = await getStreamInfo();
    
    if (streamInfo) {
      console.log(`✅ Stream 已存在`);
      console.log(`   Stream ID: ${streamInfo.id}`);
      console.log(`   状态: ${streamInfo.status}`);
      
      // 如果 Stream 是暂停状态，启动它
      if (streamInfo.status === 'paused') {
        await startStream();
      }
    } else {
      console.log('⚠️  未找到 Stream 配置');
      console.log('   请按照文档创建 Stream 或设置环境变量');
    }

    // 同步当前的交易对地址到 Stream
    await syncStreamAddresses();
  } catch (error) {
    console.error('❌ 初始化 Stream 失败:', error.message);
  }
}

// 同步 Stream 地址列表
async function syncStreamAddresses() {
  try {
    // 获取所有交易对
    const pairs = await pairRepository.getRecentPairs(200);
    
    if (pairs.length === 0) {
      console.log('   暂无交易对需要监听');
      return;
    }

    const addresses = pairs.map((p) => p.address.toLowerCase());
    
    // 更新 Stream 配置
    const success = await updateStreamAddresses(addresses);
    
    if (success) {
      console.log(`✅ Stream 同步完成: ${addresses.length} 个交易对`);
    }
  } catch (error) {
    console.error('❌ 同步 Stream 地址失败:', error.message);
  }
}

// 更新所有交易对的分析数据
async function updateAllPairsAnalytics() {
  try {
    const pairs = await pairRepository.getRecentPairs(100);

    for (const pair of pairs) {
      await updateHourlyAnalytics(pair.address);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ 已更新 ${pairs.length} 个交易对的分析数据`);
  } catch (error) {
    console.error('❌ 更新分析数据失败:', error.message);
  }
}

// 打印系统状态
async function printStatus() {
  try {
    const memUsage = process.memoryUsage();
    const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    
    const pairsCount = await pairRepository.getPairsCount();

    console.log('\n' + '-'.repeat(50));
    console.log(`📊 系统状态 | ${new Date().toLocaleString('zh-CN')}`);
    console.log(`   运行模式: QuickNode Streams`);
    console.log(`   监控中的交易对: ${pairsCount}`);
    console.log(`   内存使用: ${memUsedMB} MB`);
    console.log('-'.repeat(50));
  } catch (error) {
    console.error('❌ 获取状态失败:', error.message);
  }
}

// 停止监控系统
async function stopMonitoring() {
  if (!isRunning) {
    return;
  }

  console.log('\n⏹️  正在停止监控系统...');

  try {
    // 停止 Factory 监听器
    stopFactoryListener();

    // 关闭 Webhook 服务器
    if (webhookServer) {
      webhookServer.close();
      console.log('✅ Webhook 服务器已关闭');
    }

    // 关闭数据库连接
    await db.close();

    isRunning = false;
    console.log('✅ 监控系统已停止');
    process.exit(0);
  } catch (error) {
    console.error('❌ 停止监控系统时出错:', error.message);
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', async () => {
  console.log('\n\n收到退出信号...');
  await stopMonitoring();
});

process.on('SIGTERM', async () => {
  console.log('\n\n收到终止信号...');
  await stopMonitoring();
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  stopMonitoring();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});

// 启动
startMonitoring();

