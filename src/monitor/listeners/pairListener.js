const { ethers } = require('ethers');
const { provider, getBlockTimestamp } = require('../../blockchain/provider');
const { PAIR_ABI } = require('../../contracts/abis');
const pairRepository = require('../../db/repositories/pairRepository');
const transactionRepository = require('../../db/repositories/transactionRepository');
const liquidityRepository = require('../../db/repositories/liquidityRepository');
const alertRepository = require('../../db/repositories/alertRepository');

// 存储所有正在监听的交易对
const activePairListeners = new Map();

// 大额交易阈值（USD）
const LARGE_TX_THRESHOLD = parseFloat(process.env.LARGE_TRANSACTION_THRESHOLD_USD || '10000');

// 启动单个交易对的监听器
async function startPairListener(pairAddress) {
  try {
    pairAddress = pairAddress.toLowerCase();

    // 如果已经在监听，跳过
    if (activePairListeners.has(pairAddress)) {
      console.log(`   ⚠️  交易对 ${pairAddress} 已在监听中`);
      return;
    }

    console.log(`\n🎯 启动交易对监听器: ${pairAddress}`);

    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);

    // 监听Swap事件
    pairContract.on('Swap', async (sender, amount0In, amount1In, amount0Out, amount1Out, to, event) => {
      await handleSwapEvent(pairAddress, {
        sender,
        amount0In,
        amount1In,
        amount0Out,
        amount1Out,
        to,
        event,
      });
    });

    // 监听Mint事件（添加流动性）
    pairContract.on('Mint', async (sender, amount0, amount1, event) => {
      await handleMintEvent(pairAddress, {
        sender,
        amount0,
        amount1,
        event,
      });
    });

    // 监听Burn事件（移除流动性）
    pairContract.on('Burn', async (sender, amount0, amount1, to, event) => {
      await handleBurnEvent(pairAddress, {
        sender,
        amount0,
        amount1,
        to,
        event,
      });
    });

    // 监听Sync事件（价格同步）
    pairContract.on('Sync', async (reserve0, reserve1, event) => {
      await handleSyncEvent(pairAddress, {
        reserve0,
        reserve1,
        event,
      });
    });

    activePairListeners.set(pairAddress, pairContract);
    console.log(`✅ 交易对监听器启动成功`);
  } catch (error) {
    console.error(`❌ 启动交易对监听器失败 ${pairAddress}:`, error.message);
  }
}

// 处理Swap事件
async function handleSwapEvent(pairAddress, data) {
  try {
    const { sender, amount0In, amount1In, amount0Out, amount1Out, to, event } = data;

    const timestamp = await getBlockTimestamp(event.log.blockNumber);

    // 计算交易金额（简化版，实际应该根据价格计算USD价值）
    const volume0 = amount0In > 0 ? amount0In : amount0Out;
    const volume1 = amount1In > 0 ? amount1In : amount1Out;

    // TODO: 这里需要实现价格oracle来计算USD价值
    const amountUsd = null;
    const isLarge = false; // 暂时设为false，需要实现价格计算

    const txData = {
      pairAddress: pairAddress.toLowerCase(),
      transactionHash: event.log.transactionHash,
      blockNumber: event.log.blockNumber,
      sender: sender.toLowerCase(),
      recipient: to.toLowerCase(),
      amount0In: amount0In.toString(),
      amount1In: amount1In.toString(),
      amount0Out: amount0Out.toString(),
      amount1Out: amount1Out.toString(),
      amountUsd,
      isLarge,
      gasPrice: null,
      gasUsed: null,
      timestamp,
    };

    const savedTx = await transactionRepository.createTransaction(txData);

    if (savedTx) {
      console.log(`💱 Swap事件: ${pairAddress.slice(0, 10)}... | 交易: ${event.log.transactionHash.slice(0, 10)}...`);

      // 如果是大额交易，创建警报
      if (isLarge) {
        await createLargeTransactionAlert(pairAddress, savedTx, 'buy');
      }
    }
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理Swap事件失败:', error.message);
    }
  }
}

// 处理Mint事件（添加流动性）
async function handleMintEvent(pairAddress, data) {
  try {
    const { sender, amount0, amount1, event } = data;

    const timestamp = await getBlockTimestamp(event.log.blockNumber);

    const eventData = {
      pairAddress: pairAddress.toLowerCase(),
      transactionHash: event.log.transactionHash,
      blockNumber: event.log.blockNumber,
      eventType: 'mint',
      sender: sender.toLowerCase(),
      recipient: sender.toLowerCase(),
      amount0: amount0.toString(),
      amount1: amount1.toString(),
      liquidity: null,
      amountUsd: null,
      timestamp,
    };

    const savedEvent = await liquidityRepository.createLiquidityEvent(eventData);

    if (savedEvent) {
      console.log(`➕ Mint事件: ${pairAddress.slice(0, 10)}... | 金额0: ${ethers.formatEther(amount0).slice(0, 8)}`);

      // 检查是否为大额添加流动性
      await checkLiquiditySurge(pairAddress, amount0, amount1);
    }
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理Mint事件失败:', error.message);
    }
  }
}

// 处理Burn事件（移除流动性）
async function handleBurnEvent(pairAddress, data) {
  try {
    const { sender, amount0, amount1, to, event } = data;

    const timestamp = await getBlockTimestamp(event.log.blockNumber);

    const eventData = {
      pairAddress: pairAddress.toLowerCase(),
      transactionHash: event.log.transactionHash,
      blockNumber: event.log.blockNumber,
      eventType: 'burn',
      sender: sender.toLowerCase(),
      recipient: to.toLowerCase(),
      amount0: amount0.toString(),
      amount1: amount1.toString(),
      liquidity: null,
      amountUsd: null,
      timestamp,
    };

    const savedEvent = await liquidityRepository.createLiquidityEvent(eventData);

    if (savedEvent) {
      console.log(`➖ Burn事件: ${pairAddress.slice(0, 10)}... | 金额0: ${ethers.formatEther(amount0).slice(0, 8)}`);

      // 检查是否为大额移除流动性（Rug Pull风险）
      await checkLiquidityDrain(pairAddress, amount0, amount1);
    }
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理Burn事件失败:', error.message);
    }
  }
}

// 处理Sync事件（价格同步）
async function handleSyncEvent(pairAddress, data) {
  try {
    const { reserve0, reserve1, event } = data;

    // 更新交易对的储备量
    await pairRepository.updatePairReserves(
      pairAddress.toLowerCase(),
      reserve0.toString(),
      reserve1.toString(),
      null
    );

    // console.log(`🔄 Sync事件: ${pairAddress.slice(0, 10)}... | Reserve0: ${ethers.formatEther(reserve0).slice(0, 8)}`);
  } catch (error) {
    // Sync事件频繁，不打印错误
  }
}

// 创建大额交易警报
async function createLargeTransactionAlert(pairAddress, transaction, type) {
  try {
    const alertData = {
      pairAddress,
      alertType: type === 'buy' ? 'large_buy' : 'large_sell',
      severity: 'high',
      title: `检测到大额${type === 'buy' ? '买入' : '卖出'}交易`,
      description: `交易金额: $${transaction.amount_usd?.toFixed(2)}`,
      metadata: {
        transactionHash: transaction.transaction_hash,
        amountUsd: transaction.amount_usd,
      },
      timestamp: transaction.timestamp,
    };

    await alertRepository.createAlert(alertData);
    console.log(`🚨 创建大额交易警报: ${type} | $${transaction.amount_usd?.toFixed(2)}`);
  } catch (error) {
    console.error('❌ 创建大额交易警报失败:', error.message);
  }
}

// 检查流动性激增
async function checkLiquiditySurge(pairAddress, amount0, amount1) {
  // TODO: 实现流动性激增检测逻辑
  // 这里可以比较当前添加的流动性与池子总流动性的比例
}

// 检查流动性流失
async function checkLiquidityDrain(pairAddress, amount0, amount1) {
  // TODO: 实现流动性流失检测逻辑
  // 大额移除可能意味着Rug Pull风险
  try {
    const pair = await pairRepository.getPairByAddress(pairAddress);
    if (!pair) return;

    // 如果移除的流动性超过池子的50%，发出警报
    const removedPercentage0 = (parseFloat(amount0.toString()) / parseFloat(pair.reserve0)) * 100;

    if (removedPercentage0 > 50) {
      const alertData = {
        pairAddress,
        alertType: 'liquidity_drain',
        severity: 'high',
        title: '⚠️ 检测到大额流动性移除',
        description: `移除了池子 ${removedPercentage0.toFixed(2)}% 的流动性，可能存在Rug Pull风险！`,
        metadata: {
          percentage: removedPercentage0,
          amount0: amount0.toString(),
          amount1: amount1.toString(),
        },
        timestamp: new Date(),
      };

      await alertRepository.createAlert(alertData);
      console.log(`🚨 流动性流失警报: ${removedPercentage0.toFixed(2)}%`);
    }
  } catch (error) {
    console.error('❌ 检查流动性流失失败:', error.message);
  }
}

// 停止单个交易对的监听
function stopPairListener(pairAddress) {
  pairAddress = pairAddress.toLowerCase();
  const pairContract = activePairListeners.get(pairAddress);

  if (pairContract) {
    pairContract.removeAllListeners();
    activePairListeners.delete(pairAddress);
    console.log(`⏹️  停止监听交易对: ${pairAddress}`);
  }
}

// 停止所有交易对监听
function stopAllPairListeners() {
  activePairListeners.forEach((contract, address) => {
    contract.removeAllListeners();
    console.log(`⏹️  停止监听交易对: ${address}`);
  });
  activePairListeners.clear();
}

// 获取活跃的监听器数量
function getActiveListenersCount() {
  return activePairListeners.size;
}

module.exports = {
  startPairListener,
  stopPairListener,
  stopAllPairListeners,
  getActiveListenersCount,
};

