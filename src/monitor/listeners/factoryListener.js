const { ethers } = require('ethers');
const { provider } = require('../../blockchain/provider');
const { FACTORY_ABI } = require('../../contracts/abis');
const { getTokenInfo } = require('../../blockchain/tokenService');
const pairRepository = require('../../db/repositories/pairRepository');
const { getBlockTimestamp } = require('../../blockchain/provider');

// 导入 Stream 管理器
let streamManager = null;
try {
  streamManager = require('../streams/streamManager');
} catch (error) {
  // 如果没有 Stream 模块，使用传统监听方式
}

// PancakeSwap V2 Factory 地址
const FACTORY_ADDRESS = process.env.PANCAKE_FACTORY_ADDRESS || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';

let factoryContract;
let isListening = false;

// 初始化Factory监听器
async function initFactoryListener() {
  console.log('🚀 初始化PancakeSwap Factory监听器...');
  console.log(`   Factory地址: ${FACTORY_ADDRESS}`);

  factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

  // 监听PairCreated事件
  factoryContract.on('PairCreated', async (token0, token1, pairAddress, pairIndex, event) => {
    await handlePairCreated(token0, token1, pairAddress, pairIndex, event);
  });

  isListening = true;
  console.log('✅ Factory监听器启动成功');
}

// 处理PairCreated事件
async function handlePairCreated(token0, token1, pairAddress, pairIndex, event) {
  try {
    console.log('\n🆕 检测到新交易对创建:');
    console.log(`   Pair地址: ${pairAddress}`);
    console.log(`   Token0: ${token0}`);
    console.log(`   Token1: ${token1}`);
    console.log(`   交易哈希: ${event.log.transactionHash}`);

    // 检查是否已存在
    const exists = await pairRepository.pairExists(pairAddress.toLowerCase());
    if (exists) {
      console.log('   ⚠️  交易对已存在，跳过');
      return;
    }

    // 获取区块时间戳
    const timestamp = await getBlockTimestamp(event.log.blockNumber);

    // 获取代币信息
    console.log('   📝 获取代币信息...');
    const [token0Info, token1Info] = await Promise.all([
      getTokenInfo(token0),
      getTokenInfo(token1),
    ]);

    // 保存交易对信息
    const pairData = {
      address: pairAddress.toLowerCase(),
      token0Address: token0.toLowerCase(),
      token1Address: token1.toLowerCase(),
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
    };

    const savedPair = await pairRepository.createPair(pairData);

    if (savedPair) {
      console.log(`✅ 新交易对已保存: ${token0Info.symbol}/${token1Info.symbol}`);
      console.log(`   数据库ID: ${savedPair.id}`);

      // 如果使用 Streams 模式，更新 Stream 配置
      if (streamManager) {
        console.log('   🔄 更新 Stream 配置...');
        await addPairToStream(pairAddress);
      }
    }
  } catch (error) {
    console.error('❌ 处理PairCreated事件失败:', error.message);
  }
}

// 将新交易对添加到 Stream
async function addPairToStream(pairAddress) {
  try {
    // 获取所有交易对地址
    const pairs = await pairRepository.getRecentPairs(200);
    const addresses = pairs.map((p) => p.address.toLowerCase());

    // 更新 Stream 配置
    await streamManager.updateStreamAddresses(addresses);
    console.log(`   ✅ Stream 已更新，现监听 ${addresses.length} 个交易对`);
  } catch (error) {
    console.error('   ❌ 更新 Stream 失败:', error.message);
  }
}

// 扫描历史交易对（可选）
async function scanHistoricalPairs(startBlock, endBlock) {
  console.log(`\n🔍 扫描历史交易对 (区块 ${startBlock} - ${endBlock})...`);

  try {
    const filter = factoryContract.filters.PairCreated();
    const events = await factoryContract.queryFilter(filter, startBlock, endBlock);

    console.log(`   找到 ${events.length} 个PairCreated事件`);

    for (const event of events) {
      const [token0, token1, pairAddress, pairIndex] = event.args;
      await handlePairCreated(token0, token1, pairAddress, pairIndex, event);
    }

    console.log('✅ 历史交易对扫描完成');
  } catch (error) {
    console.error('❌ 扫描历史交易对失败:', error.message);
  }
}

// 停止监听
function stopFactoryListener() {
  if (factoryContract && isListening) {
    factoryContract.removeAllListeners('PairCreated');
    isListening = false;
    console.log('⏹️  Factory监听器已停止');
  }
}

module.exports = {
  initFactoryListener,
  stopFactoryListener,
  scanHistoricalPairs,
  FACTORY_ADDRESS,
};
