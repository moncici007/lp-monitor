const { ethers } = require('ethers');
const { getBlockTimestamp } = require('../../blockchain/provider');
const transactionRepository = require('../../db/repositories/transactionRepository');
const liquidityRepository = require('../../db/repositories/liquidityRepository');
const pairRepository = require('../../db/repositories/pairRepository');
const alertRepository = require('../../db/repositories/alertRepository');

// 事件签名
const EVENT_SIGNATURES = {
  SWAP: '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
  MINT: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  BURN: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
  SYNC: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
};

// 处理 Stream 推送的数据
async function handleStreamData(batch) {
  try {
    const { logs } = batch;
    
    if (!logs || logs.length === 0) {
      return;
    }

    console.log(`   处理 ${logs.length} 条日志...`);

    for (const log of logs) {
      await processLog(log);
    }
  } catch (error) {
    console.error('❌ 处理批次数据失败:', error.message);
  }
}

// 处理单条日志
async function processLog(log) {
  try {
    const { topics, address, data, blockNumber, transactionHash, blockTimestamp } = log;
    
    if (!topics || topics.length === 0) {
      return;
    }

    const eventSignature = topics[0];
    const pairAddress = address.toLowerCase();

    // 根据事件签名分发处理
    switch (eventSignature) {
      case EVENT_SIGNATURES.SWAP:
        await handleSwapEvent(log);
        break;
      case EVENT_SIGNATURES.MINT:
        await handleMintEvent(log);
        break;
      case EVENT_SIGNATURES.BURN:
        await handleBurnEvent(log);
        break;
      case EVENT_SIGNATURES.SYNC:
        await handleSyncEvent(log);
        break;
      default:
        // 未知事件，忽略
        break;
    }
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理日志失败:', error.message);
    }
  }
}

// 处理 Swap 事件
async function handleSwapEvent(log) {
  try {
    const { address, data, topics, blockNumber, transactionHash, blockTimestamp } = log;
    const pairAddress = address.toLowerCase();

    // 解析 Swap 事件数据
    // event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decodedData = abiCoder.decode(
      ['uint256', 'uint256', 'uint256', 'uint256'],
      data
    );

    const sender = '0x' + topics[1].slice(26);
    const to = '0x' + topics[2].slice(26);
    const amount0In = decodedData[0].toString();
    const amount1In = decodedData[1].toString();
    const amount0Out = decodedData[2].toString();
    const amount1Out = decodedData[3].toString();

    // 转换时间戳
    const timestamp = blockTimestamp 
      ? new Date(parseInt(blockTimestamp, 16) * 1000)
      : await getBlockTimestamp(parseInt(blockNumber, 16));

    const txData = {
      pairAddress,
      transactionHash,
      blockNumber: parseInt(blockNumber, 16),
      sender: sender.toLowerCase(),
      recipient: to.toLowerCase(),
      amount0In,
      amount1In,
      amount0Out,
      amount1Out,
      amountUsd: null,
      isLarge: false,
      gasPrice: null,
      gasUsed: null,
      timestamp,
    };

    await transactionRepository.createTransaction(txData);
    console.log(`💱 Swap: ${pairAddress.slice(0, 10)}... | ${transactionHash.slice(0, 10)}...`);
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理 Swap 事件失败:', error.message);
    }
  }
}

// 处理 Mint 事件（添加流动性）
async function handleMintEvent(log) {
  try {
    const { address, data, topics, blockNumber, transactionHash, blockTimestamp } = log;
    const pairAddress = address.toLowerCase();

    // 解析 Mint 事件数据
    // event Mint(address indexed sender, uint amount0, uint amount1)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decodedData = abiCoder.decode(['uint256', 'uint256'], data);

    const sender = '0x' + topics[1].slice(26);
    const amount0 = decodedData[0].toString();
    const amount1 = decodedData[1].toString();

    const timestamp = blockTimestamp
      ? new Date(parseInt(blockTimestamp, 16) * 1000)
      : await getBlockTimestamp(parseInt(blockNumber, 16));

    const eventData = {
      pairAddress,
      transactionHash,
      blockNumber: parseInt(blockNumber, 16),
      eventType: 'mint',
      sender: sender.toLowerCase(),
      recipient: sender.toLowerCase(),
      amount0,
      amount1,
      liquidity: null,
      amountUsd: null,
      timestamp,
    };

    await liquidityRepository.createLiquidityEvent(eventData);
    console.log(`➕ Mint: ${pairAddress.slice(0, 10)}...`);
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理 Mint 事件失败:', error.message);
    }
  }
}

// 处理 Burn 事件（移除流动性）
async function handleBurnEvent(log) {
  try {
    const { address, data, topics, blockNumber, transactionHash, blockTimestamp } = log;
    const pairAddress = address.toLowerCase();

    // 解析 Burn 事件数据
    // event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decodedData = abiCoder.decode(['uint256', 'uint256'], data);

    const sender = '0x' + topics[1].slice(26);
    const to = '0x' + topics[2].slice(26);
    const amount0 = decodedData[0].toString();
    const amount1 = decodedData[1].toString();

    const timestamp = blockTimestamp
      ? new Date(parseInt(blockTimestamp, 16) * 1000)
      : await getBlockTimestamp(parseInt(blockNumber, 16));

    const eventData = {
      pairAddress,
      transactionHash,
      blockNumber: parseInt(blockNumber, 16),
      eventType: 'burn',
      sender: sender.toLowerCase(),
      recipient: to.toLowerCase(),
      amount0,
      amount1,
      liquidity: null,
      amountUsd: null,
      timestamp,
    };

    await liquidityRepository.createLiquidityEvent(eventData);
    console.log(`➖ Burn: ${pairAddress.slice(0, 10)}...`);

    // 检查是否为大额移除（Rug Pull 风险）
    await checkLiquidityDrain(pairAddress, amount0, amount1);
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理 Burn 事件失败:', error.message);
    }
  }
}

// 处理 Sync 事件（价格同步）
async function handleSyncEvent(log) {
  try {
    const { address, data, blockNumber } = log;
    const pairAddress = address.toLowerCase();

    // 解析 Sync 事件数据
    // event Sync(uint112 reserve0, uint112 reserve1)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decodedData = abiCoder.decode(['uint112', 'uint112'], data);

    const reserve0 = decodedData[0].toString();
    const reserve1 = decodedData[1].toString();

    // 更新交易对的储备量
    await pairRepository.updatePairReserves(pairAddress, reserve0, reserve1, null);
  } catch (error) {
    // Sync 事件频繁，不打印错误
  }
}

// 检查流动性流失（Rug Pull 风险）
async function checkLiquidityDrain(pairAddress, amount0, amount1) {
  try {
    const pair = await pairRepository.getPairByAddress(pairAddress);
    if (!pair || !pair.reserve0) return;

    // 计算移除的百分比
    const removedPercentage0 = (parseFloat(amount0) / parseFloat(pair.reserve0)) * 100;

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

module.exports = {
  handleStreamData,
  processLog,
};

