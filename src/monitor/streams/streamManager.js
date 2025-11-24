const axios = require('axios');
require('dotenv').config();

const QUICKNODE_API_BASE = 'https://api.quicknode.com/streams/rest/v1/streams';
const STREAM_ID = process.env.QUICKNODE_STREAM_ID;
const API_KEY = process.env.QUICKNODE_API_KEY;

// 事件签名 - 同时支持 V2 和 V3
const EVENT_TOPICS = [
  // Factory 事件
  '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
  // PancakeSwap V2
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap V2
  '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // Mint V2
  '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496', // Burn V2
  '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1', // Sync
  // PancakeSwap V3
  '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83', // Swap V3
  '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde', // Mint V3
  '0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c', // Burn V3
];

// 更新 Stream 配置
async function updateStreamConfig(config = {}) {
  if (!STREAM_ID || !API_KEY) {
    console.warn('⚠️  未配置 QUICKNODE_STREAM_ID 或 QUICKNODE_API_KEY');
    console.warn('   Stream 功能将不可用，请在 .env.local 中配置');
    return false;
  }

  try {
    console.log(`\n📡 更新 Stream 配置...`);

    const response = await axios.patch(
      `${QUICKNODE_API_BASE}/${STREAM_ID}`,
      config,
      {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        timeout: 30000,
      }
    );

    console.log(`✅ Stream 配置更新成功`);
    return true;
  } catch (error) {
    if (error.response) {
      console.error('❌ 更新 Stream 失败:', error.response.data);
    } else if (error.request) {
      console.error('❌ 无法连接到 QuickNode API');
    } else {
      console.error('❌ 更新 Stream 失败:', error.message);
    }
    return false;
  }
}

// 获取 Stream 信息
async function getStreamInfo() {
  if (!STREAM_ID || !API_KEY) {
    return null;
  }

  try {
    const response = await axios.get(`${QUICKNODE_API_BASE}/${STREAM_ID}`, {
      headers: {
        'x-api-key': API_KEY,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('❌ 获取 Stream 信息失败:', error.message);
    return null;
  }
}

// 创建新的 Stream（如果还没有）
async function createStream(webhookUrl, pairAddresses = []) {
  if (!API_KEY) {
    console.error('❌ 未配置 QUICKNODE_API_KEY');
    return null;
  }

  try {
    console.log(`\n🔧 创建新 Stream...`);

    const response = await axios.post(
      QUICKNODE_API_BASE,
      {
        name: 'BSC LP Monitor Stream',
        network: 'bsc-mainnet',
        dataset: 'logs',
        filter_config: {
          type: 'logs',
          addresses: pairAddresses,
          topics: EVENT_TOPICS,
        },
        destination: {
          type: 'webhook',
          url: webhookUrl,
        },
        region: 'usa_east',
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log(`✅ Stream 创建成功`);
    console.log(`   Stream ID: ${response.data.id}`);
    console.log(`   请将此 ID 添加到 .env.local 中的 QUICKNODE_STREAM_ID`);

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('❌ 创建 Stream 失败:', error.response.data);
    } else {
      console.error('❌ 创建 Stream 失败:', error.message);
    }
    return null;
  }
}

// 启动/恢复 Stream
async function startStream() {
  if (!STREAM_ID || !API_KEY) {
    return false;
  }

  try {
    await axios.post(
      `${QUICKNODE_API_BASE}/${STREAM_ID}/start`,
      {},
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

    console.log('✅ Stream 已启动');
    return true;
  } catch (error) {
    console.error('❌ 启动 Stream 失败:', error.message);
    return false;
  }
}

// 暂停 Stream
async function pauseStream() {
  if (!STREAM_ID || !API_KEY) {
    return false;
  }

  try {
    await axios.post(
      `${QUICKNODE_API_BASE}/${STREAM_ID}/pause`,
      {},
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

    console.log('⏸️  Stream 已暂停');
    return true;
  } catch (error) {
    console.error('❌ 暂停 Stream 失败:', error.message);
    return false;
  }
}

// 生成过滤器函数并编码为 Base64
function generateFilterFunction(addresses, topics) {
  // 分离 Factory 地址和 Pair 地址
  const FACTORY_ADDRESS = process.env.PANCAKE_FACTORY_ADDRESS || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
  const factoryAddress = FACTORY_ADDRESS.toLowerCase();
  const pairAddresses = addresses.filter(addr => addr.toLowerCase() !== factoryAddress);
  
  // 分离 PairCreated 签名和其他事件签名
  const PAIR_CREATED_SIGNATURE = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
  // const pairEventTopics = topics.filter(topic => topic !== PAIR_CREATED_SIGNATURE);
  
  // 生成 JavaScript 过滤器代码（与 quicknode-stream-filter-with-factory.js 保持一致）
  const filterCode = `
function main(stream) {
  // ============================================================
  // 配置区域
  // ============================================================
  
  // PancakeSwap V2 Factory 地址
  const FACTORY_ADDRESS = "${factoryAddress}";
  
  // 监控的交易对地址列表
  const MONITORED_PAIRS = ${JSON.stringify(pairAddresses, null, 2)};
  
  // 是否监控所有交易对
  const MONITOR_ALL_PAIRS = false;
  
  // 事件签名
  const EVENT_SIGNATURES = {
    PAIR_CREATED: "${PAIR_CREATED_SIGNATURE}",
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
    BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",
    SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
  };
  
  // ============================================================
  // 处理逻辑
  // ============================================================
  
  const events = [];
  const stats = {
    totalBlocks: stream.data.length,
    totalReceipts: 0,
    totalLogs: 0,
    matchedEvents: 0,
    eventTypes: {
      pairCreated: 0,
      swap: 0,
      mint: 0,
      burn: 0,
      sync: 0
    }
  };
  
  // 将监控地址转换为 Set 以提高查找效率
  const monitoredPairsSet = new Set(
    MONITORED_PAIRS.map(addr => addr.toLowerCase())
  );
  
  // 处理每个区块
  for (const block of stream.data) {
    const receipts = block.receipts || [];
    stats.totalReceipts += receipts.length;
    
    for (const receipt of receipts) {
      // 跳过失败的交易
      if (receipt.status !== "0x1") {
        continue;
      }
      
      const logs = receipt.logs || [];
      stats.totalLogs += logs.length;
      
      for (const log of logs) {
        const topic0 = log.topics[0];
        const logAddress = log.address.toLowerCase();
        
        let eventType = null;
        let shouldInclude = false;
        
        // 1. 检查是否是 Factory 的 PairCreated 事件
        if (topic0 === EVENT_SIGNATURES.PAIR_CREATED && logAddress === FACTORY_ADDRESS) {
          eventType = "pairCreated";
          shouldInclude = true;  // Factory 事件始终包含
          stats.eventTypes.pairCreated++;
        } 
        // 2. 检查是否是 Pair 事件
        else {
          // 首先检查地址是否在监控列表中（或者监控所有）
          const isPairMonitored = MONITOR_ALL_PAIRS || monitoredPairsSet.has(logAddress);
          
          if (isPairMonitored) {
            // 再检查事件类型
            if (topic0 === EVENT_SIGNATURES.SWAP) {
              eventType = "swap";
              shouldInclude = true;
              stats.eventTypes.swap++;
            } else if (topic0 === EVENT_SIGNATURES.MINT) {
              eventType = "mint";
              shouldInclude = true;
              stats.eventTypes.mint++;
            } else if (topic0 === EVENT_SIGNATURES.BURN) {
              eventType = "burn";
              shouldInclude = true;
              stats.eventTypes.burn++;
            } else if (topic0 === EVENT_SIGNATURES.SYNC) {
              eventType = "sync";
              shouldInclude = true;
              stats.eventTypes.sync++;
            }
          }
        }
        
        // 如果匹配到事件且应该包含，添加到结果
        if (eventType && shouldInclude) {
          stats.matchedEvents++;
          
          events.push({
            // 事件基本信息
            eventType: eventType,
            address: log.address,
            
            // 区块和交易信息
            blockNumber: block.number,
            blockTime: block.timestamp,
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            logIndex: log.logIndex,
            
            // 事件数据
            topics: log.topics,
            data: log.data,
            
            // 交易详情（可选）
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
            
            // 状态
            removed: log.removed || false
          });
        }
      }
    }
  }
  
  // ============================================================
  // 返回结果
  // ============================================================
  
  return {
    config: {
      factoryAddress: FACTORY_ADDRESS,
      monitoringFactory: true,
      monitoredPairsCount: MONITORED_PAIRS.length,
      monitoringAll: MONITOR_ALL_PAIRS
    },
    events: events,
    stats: stats
  };
}
  `.trim();

  // 转换为 Base64
  return Buffer.from(filterCode).toString('base64');
}

// 更新 Stream 监听的地址列表（便捷函数）
async function updateStreamAddresses(pairAddresses, includeFactory = true) {
  if (!STREAM_ID || !API_KEY) {
    console.warn('⚠️  未配置 QUICKNODE_STREAM_ID 或 QUICKNODE_API_KEY');
    console.warn('   Stream 功能将不可用，请在 .env.local 中配置');
    return false;
  }

  try {
    // 始终包含 Factory 地址以监听 PairCreated 事件
    const FACTORY_ADDRESS = process.env.PANCAKE_FACTORY_ADDRESS || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
    const allAddresses = includeFactory 
      ? [FACTORY_ADDRESS.toLowerCase(), ...pairAddresses.map(a => a.toLowerCase())]
      : pairAddresses.map(a => a.toLowerCase());

    console.log(`   Factory 地址: ${FACTORY_ADDRESS}`);
    console.log(`   监听交易对数量: ${pairAddresses.length}`);
    console.log(`   总地址数量: ${allAddresses.length}`);

    // 生成过滤器函数（Base64 编码）
    const filterFunction = generateFilterFunction(allAddresses, EVENT_TOPICS);

    console.log(`   过滤器函数已生成 (${filterFunction.length} 字节 Base64)`);

    // 使用 updateStreamConfig 更新过滤器函数
    const result = await updateStreamConfig({
      filter_function: filterFunction,
    });

    return result !== false;
  } catch (error) {
    console.error('❌ 更新 Stream 地址失败:', error.message);
    return false;
  }
}

module.exports = {
  updateStreamConfig,        // 通用的 Stream 配置更新函数
  updateStreamAddresses,     // 便捷函数：更新地址列表
  generateFilterFunction,    // 生成 Base64 编码的过滤器函数
  getStreamInfo,
  createStream,
  startStream,
  pauseStream,
};

