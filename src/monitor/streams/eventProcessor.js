const { ethers } = require('ethers');
const { getBlockTimestamp } = require('../../blockchain/provider');
const transactionRepository = require('../../db/repositories/transactionRepository');
const liquidityRepository = require('../../db/repositories/liquidityRepository');
const pairRepository = require('../../db/repositories/pairRepository');
const alertRepository = require('../../db/repositories/alertRepository');

// 事件签名 - 支持 V2 和 V3
const EVENT_SIGNATURES = {
  // Factory 事件
  PAIR_CREATED: '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9',
  
  // PancakeSwap V2
  SWAP_V2: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  MINT_V2: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  BURN_V2: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
  SYNC: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
  
  // PancakeSwap V3
  SWAP_V3: '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
  MINT_V3: '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde',
  BURN_V3: '0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c',
  
  // 向后兼容 (默认使用 V2)
  SWAP: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  MINT: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  BURN: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
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
      case EVENT_SIGNATURES.PAIR_CREATED:
        await handlePairCreatedEvent(log);
        break;
      case EVENT_SIGNATURES.SWAP:
      case EVENT_SIGNATURES.SWAP_V2:
      case EVENT_SIGNATURES.SWAP_V3:
        await handleSwapEvent(log);
        break;
      case EVENT_SIGNATURES.MINT:
      case EVENT_SIGNATURES.MINT_V2:
      case EVENT_SIGNATURES.MINT_V3:
        await handleMintEvent(log);
        break;
      case EVENT_SIGNATURES.BURN:
      case EVENT_SIGNATURES.BURN_V2:
      case EVENT_SIGNATURES.BURN_V3:
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

// 处理 PairCreated 事件
async function handlePairCreatedEvent(log) {
  try {
    const { address: factoryAddress, data, topics, blockNumber, transactionHash, blockTimestamp } = log;
    
    // PairCreated(address indexed token0, address indexed token1, address pair, uint)
    // topics[0] = 事件签名
    // topics[1] = token0 (indexed)
    // topics[2] = token1 (indexed)
    // data = pair address + pair index
    
    if (!topics || topics.length < 3) {
      console.error('❌ PairCreated 事件数据不完整');
      return;
    }

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // 从 topics 中提取 token0 和 token1
    const token0 = ethers.getAddress('0x' + topics[1].slice(26)); // 移除前导零
    const token1 = ethers.getAddress('0x' + topics[2].slice(26));
    
    // 从 data 中提取 pair 地址和 index
    const [pairAddress, pairIndex] = abiCoder.decode(['address', 'uint256'], data);

    console.log('\n🆕 检测到新交易对创建:');
    console.log(`   Factory: ${factoryAddress}`);
    console.log(`   Pair: ${pairAddress}`);
    console.log(`   Token0: ${token0}`);
    console.log(`   Token1: ${token1}`);
    console.log(`   Index: ${pairIndex.toString()}`);
    console.log(`   Tx: ${transactionHash}`);

    // 检查是否已存在
    const exists = await pairRepository.pairExists(pairAddress.toLowerCase());
    if (exists) {
      console.log('   ⚠️  交易对已存在，跳过');
      return;
    }

    // 解析区块号和时间戳
    let blockNum = blockNumber;
    if (typeof blockNumber === 'string') {
      blockNum = blockNumber.startsWith('0x') 
        ? parseInt(blockNumber, 16) 
        : parseInt(blockNumber, 10);
    }

    let timestamp = blockTimestamp;
    if (blockTimestamp) {
      if (typeof blockTimestamp === 'string') {
        timestamp = new Date(parseInt(blockTimestamp, 10) * 1000);
      } else if (typeof blockTimestamp === 'number') {
        timestamp = new Date(blockTimestamp * 1000);
      }
    }
    
    if (!timestamp || isNaN(timestamp.getTime())) {
      timestamp = await getBlockTimestamp(blockNum);
    }

    // 获取代币信息
    console.log('   📝 获取代币信息...');
    const { getTokenInfo } = require('../../blockchain/tokenService');
    const [token0Info, token1Info] = await Promise.all([
      getTokenInfo(token0).catch(e => ({ symbol: 'UNKNOWN', name: 'Unknown', decimals: 18 })),
      getTokenInfo(token1).catch(e => ({ symbol: 'UNKNOWN', name: 'Unknown', decimals: 18 })),
    ]);

    // 保存交易对信息
    const pairData = {
      address: pairAddress.toLowerCase(),
      token0Address: token0.toLowerCase(),
      token1Address: token1.toLowerCase(),
      blockNumber: blockNum,
      transactionHash,
    };

    const savedPair = await pairRepository.createPair(pairData);

    if (savedPair) {
      console.log(`✅ 新交易对已保存: ${token0Info.symbol}/${token1Info.symbol}`);
      console.log(`   数据库ID: ${savedPair.id}`);

      // 更新 Stream 配置（添加新交易对到监听列表）
      try {
        const streamManager = require('./streamManager');
        const pairs = await pairRepository.getRecentPairs(200);
        const addresses = pairs.map((p) => p.address.toLowerCase());
        await streamManager.updateStreamAddresses(addresses, true); // includeFactory = true
        console.log(`   ✅ Stream 已更新，现监听 ${addresses.length} 个交易对`);
      } catch (error) {
        console.error('   ❌ 更新 Stream 失败:', error.message);
      }
    }
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理 PairCreated 事件失败:', error.message);
      console.error('   事件数据:', { address: log.address, blockNumber: log.blockNumber, txHash: log.transactionHash });
    }
  }
}

// 处理 Swap 事件
async function handleSwapEvent(log) {
  try {
    const { address, data, topics, blockNumber, transactionHash, blockTimestamp } = log;
    const pairAddress = address.toLowerCase();
    const eventSignature = topics[0];

    // 验证必要字段
    if (!blockNumber || !transactionHash || !topics || topics.length < 3) {
      console.error('❌ Swap 事件数据不完整:', { blockNumber, transactionHash, topicsLength: topics?.length });
      return;
    }

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    let sender, to, amount0In, amount1In, amount0Out, amount1Out;

    // 判断是 V2 还是 V3
    if (eventSignature === EVENT_SIGNATURES.SWAP_V3) {
      // V3: Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)
      const decodedData = abiCoder.decode(
        ['int256', 'int256', 'uint160', 'uint128', 'int24'],
        data
      );

      sender = '0x' + topics[1].slice(26);
      to = '0x' + topics[2].slice(26);
      
      // V3 使用正负数表示方向
      const amount0 = decodedData[0];
      const amount1 = decodedData[1];
      
      amount0In = amount0 < 0n ? (-amount0).toString() : '0';
      amount0Out = amount0 > 0n ? amount0.toString() : '0';
      amount1In = amount1 < 0n ? (-amount1).toString() : '0';
      amount1Out = amount1 > 0n ? amount1.toString() : '0';
    } else {
      // V2: Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
      const decodedData = abiCoder.decode(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        data
      );

      sender = '0x' + topics[1].slice(26);
      to = '0x' + topics[2].slice(26);
      amount0In = decodedData[0].toString();
      amount1In = decodedData[1].toString();
      amount0Out = decodedData[2].toString();
      amount1Out = decodedData[3].toString();
    }

    // 安全地解析区块号和时间戳
    const blockNum = typeof blockNumber === 'string' && blockNumber.startsWith('0x')
      ? parseInt(blockNumber, 16)
      : typeof blockNumber === 'number'
        ? blockNumber
        : parseInt(blockNumber);

    if (isNaN(blockNum)) {
      console.error('❌ 无效的区块号:', blockNumber);
      return;
    }

    // 转换时间戳
    let timestamp;
    if (blockTimestamp) {
      const timestampNum = typeof blockTimestamp === 'string' && blockTimestamp.startsWith('0x')
        ? parseInt(blockTimestamp, 16)
        : typeof blockTimestamp === 'number'
          ? blockTimestamp
          : parseInt(blockTimestamp);
      
      if (!isNaN(timestampNum)) {
        timestamp = new Date(timestampNum * 1000);
      }
    }
    
    // 如果没有有效的时间戳，从链上获取
    if (!timestamp || isNaN(timestamp.getTime())) {
      timestamp = await getBlockTimestamp(blockNum);
    }

    const txData = {
      pairAddress,
      transactionHash,
      blockNumber: blockNum,
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
      logIndex: parseInt(log.logIndex || log.index || '0', 16), // 添加 logIndex
    };

    await transactionRepository.createTransaction(txData);
    console.log(`💱 Swap: ${pairAddress.slice(0, 10)}... | ${transactionHash.slice(0, 10)}...`);
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理 Swap 事件失败:', error.message);
      console.error('   事件数据:', { address: log.address, blockNumber: log.blockNumber, txHash: log.transactionHash });
    }
  }
}

// 处理 Mint 事件（添加流动性）
async function handleMintEvent(log) {
  try {
    const { address, data, topics, blockNumber, transactionHash, blockTimestamp } = log;
    const pairAddress = address.toLowerCase();
    const eventSignature = topics[0];

    // 验证必要字段
    if (!blockNumber || !transactionHash || !topics || topics.length < 2) {
      console.error('❌ Mint 事件数据不完整');
      return;
    }

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    let sender, amount0, amount1;

    if (eventSignature === EVENT_SIGNATURES.MINT_V3) {
      // V3: Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)
      const decodedData = abiCoder.decode(['address', 'uint128', 'uint256', 'uint256'], data);
      sender = decodedData[0].toLowerCase();
      amount0 = decodedData[2].toString();
      amount1 = decodedData[3].toString();
    } else {
      // V2: Mint(address indexed sender, uint amount0, uint amount1)
      const decodedData = abiCoder.decode(['uint256', 'uint256'], data);
      sender = '0x' + topics[1].slice(26);
      amount0 = decodedData[0].toString();
      amount1 = decodedData[1].toString();
    }

    // 安全地解析区块号
    const blockNum = typeof blockNumber === 'string' && blockNumber.startsWith('0x')
      ? parseInt(blockNumber, 16)
      : typeof blockNumber === 'number'
        ? blockNumber
        : parseInt(blockNumber);

    if (isNaN(blockNum)) {
      console.error('❌ 无效的区块号:', blockNumber);
      return;
    }

    // 转换时间戳
    let timestamp;
    if (blockTimestamp) {
      const timestampNum = typeof blockTimestamp === 'string' && blockTimestamp.startsWith('0x')
        ? parseInt(blockTimestamp, 16)
        : typeof blockTimestamp === 'number'
          ? blockTimestamp
          : parseInt(blockTimestamp);
      
      if (!isNaN(timestampNum)) {
        timestamp = new Date(timestampNum * 1000);
      }
    }
    
    if (!timestamp || isNaN(timestamp.getTime())) {
      timestamp = await getBlockTimestamp(blockNum);
    }

    const eventData = {
      pairAddress,
      transactionHash,
      blockNumber: blockNum,
      eventType: 'mint',
      sender: sender.toLowerCase(),
      recipient: sender.toLowerCase(),
      amount0,
      amount1,
      liquidity: null,
      amountUsd: null,
      timestamp,
      logIndex: parseInt(log.logIndex || log.index || '0', 16), // 添加 logIndex
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
    const eventSignature = topics[0];

    // 验证必要字段
    if (!blockNumber || !transactionHash || !topics || topics.length < 2) {
      console.error('❌ Burn 事件数据不完整');
      return;
    }

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    let sender, to, amount0, amount1;

    if (eventSignature === EVENT_SIGNATURES.BURN_V3) {
      // V3: Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)
      const decodedData = abiCoder.decode(['uint128', 'uint256', 'uint256'], data);
      sender = '0x' + topics[1].slice(26);
      to = sender; // V3 没有单独的 to 地址
      amount0 = decodedData[1].toString();
      amount1 = decodedData[2].toString();
    } else {
      // V2: Burn(address indexed sender, uint amount0, uint amount1, address indexed to)
      const decodedData = abiCoder.decode(['uint256', 'uint256'], data);
      sender = '0x' + topics[1].slice(26);
      to = topics.length > 2 ? '0x' + topics[2].slice(26) : sender;
      amount0 = decodedData[0].toString();
      amount1 = decodedData[1].toString();
    }

    // 安全地解析区块号
    const blockNum = typeof blockNumber === 'string' && blockNumber.startsWith('0x')
      ? parseInt(blockNumber, 16)
      : typeof blockNumber === 'number'
        ? blockNumber
        : parseInt(blockNumber);

    if (isNaN(blockNum)) {
      console.error('❌ 无效的区块号:', blockNumber);
      return;
    }

    // 转换时间戳
    let timestamp;
    if (blockTimestamp) {
      const timestampNum = typeof blockTimestamp === 'string' && blockTimestamp.startsWith('0x')
        ? parseInt(blockTimestamp, 16)
        : typeof blockTimestamp === 'number'
          ? blockTimestamp
          : parseInt(blockTimestamp);
      
      if (!isNaN(timestampNum)) {
        timestamp = new Date(timestampNum * 1000);
      }
    }
    
    if (!timestamp || isNaN(timestamp.getTime())) {
      timestamp = await getBlockTimestamp(blockNum);
    }

    const eventData = {
      pairAddress,
      transactionHash,
      blockNumber: blockNum,
      eventType: 'burn',
      sender: sender.toLowerCase(),
      recipient: to.toLowerCase(),
      amount0,
      amount1,
      liquidity: null,
      amountUsd: null,
      timestamp,
      logIndex: parseInt(log.logIndex || log.index || '0', 16), // 添加 logIndex
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

// 处理 JavaScript 过滤器返回的预处理事件
async function handleFilteredEvents(events) {
  try {
    console.log(`   处理 ${events.length} 个预过滤事件...`);

    for (const event of events) {
      await processFilteredEvent(event);
    }
  } catch (error) {
    console.error('❌ 处理预过滤事件失败:', error.message);
  }
}

// 处理单个预过滤事件
async function processFilteredEvent(event) {
  try {
    const { eventType, address, topics, data } = event;
    
    // 转换为标准 log 格式
    const log = {
      address: address,
      topics: topics,
      data: data,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      blockTimestamp: event.blockTimestamp,
      logIndex: event.logIndex,
    };
    
    // 复用现有的处理逻辑
    await processLog(log);
  } catch (error) {
    if (!error.message.includes('duplicate key')) {
      console.error('❌ 处理预过滤事件失败:', error.message);
    }
  }
}

module.exports = {
  handleStreamData,
  handleFilteredEvents,
  processLog,
};

