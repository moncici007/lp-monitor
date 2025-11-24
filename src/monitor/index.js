#!/usr/bin/env node

require('dotenv').config();
const cron = require('node-cron');
const { testConnection } = require('../blockchain/provider');
const db = require('../db/client');
const { initFactoryListener, stopFactoryListener } = require('./listeners/factoryListener');
const { startPairListener, stopAllPairListeners, getActiveListenersCount } = require('./listeners/pairListener');
const { analyzeAllPairs, updateHourlyAnalytics } = require('./analyzer');
const pairRepository = require('../db/repositories/pairRepository');

let isRunning = false;

// 启动监控系统
async function startMonitoring() {
  if (isRunning) {
    console.log('⚠️  监控系统已在运行中');
    return;
  }

  console.log('='.repeat(60));
  console.log('🚀 BSC流动性池监控系统启动中...');
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

    // 启动Factory监听器
    console.log('\n🏭 启动Factory监听器...');
    await initFactoryListener();

    // 加载已有的交易对并启动监听
    console.log('\n📋 加载已有交易对...');
    await loadExistingPairs();

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

    // 每30秒打印状态
    setInterval(() => {
      printStatus();
    }, 30000);

    isRunning = true;

    console.log('\n' + '='.repeat(60));
    console.log('✅ 监控系统启动成功！');
    console.log('='.repeat(60));
    console.log('\n💡 提示:');
    console.log('   - 按 Ctrl+C 停止监控');
    console.log('   - 新的交易对将自动被检测和监听');
    console.log('   - 数据将实时保存到数据库\n');
  } catch (error) {
    console.error('\n❌ 启动监控系统失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 加载已有的交易对
async function loadExistingPairs() {
  try {
    const pairs = await pairRepository.getRecentPairs(100);
    console.log(`   找到 ${pairs.length} 个已有交易对`);

    for (const pair of pairs) {
      await startPairListener(pair.address);
      // 避免启动过快
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ 已为 ${pairs.length} 个交易对启动监听器`);
  } catch (error) {
    console.error('❌ 加载已有交易对失败:', error.message);
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
function printStatus() {
  const activeListeners = getActiveListenersCount();
  const memUsage = process.memoryUsage();
  const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);

  console.log('\n' + '-'.repeat(50));
  console.log(`📊 系统状态 | ${new Date().toLocaleString('zh-CN')}`);
  console.log(`   监听中的交易对: ${activeListeners}`);
  console.log(`   内存使用: ${memUsedMB} MB`);
  console.log('-'.repeat(50));
}

// 停止监控系统
async function stopMonitoring() {
  if (!isRunning) {
    return;
  }

  console.log('\n⏹️  正在停止监控系统...');

  try {
    // 停止所有监听器
    stopFactoryListener();
    stopAllPairListeners();

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

