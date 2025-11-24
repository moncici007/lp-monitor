const axios = require('axios');
require('dotenv').config();

const QUICKNODE_API_BASE = 'https://api.quicknode.com/streams/rest/v1/streams';
const STREAM_ID = process.env.QUICKNODE_STREAM_ID;
const API_KEY = process.env.QUICKNODE_API_KEY;

// 事件签名 - 同时支持 V2 和 V3
const EVENT_TOPICS = [
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

// 更新 Stream 监听的地址列表
async function updateStreamAddresses(pairAddresses) {
  if (!STREAM_ID || !API_KEY) {
    console.warn('⚠️  未配置 QUICKNODE_STREAM_ID 或 QUICKNODE_API_KEY');
    console.warn('   Stream 功能将不可用，请在 .env.local 中配置');
    return false;
  }

  try {
    console.log(`\n📡 更新 Stream 配置...`);
    console.log(`   监听地址数量: ${pairAddresses.length}`);

    const response = await axios.patch(
      `${QUICKNODE_API_BASE}/${STREAM_ID}`,
      {
        filter_config: {
          type: 'logs',
          addresses: pairAddresses,
          topics: EVENT_TOPICS,
        },
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
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

module.exports = {
  updateStreamAddresses,
  getStreamInfo,
  createStream,
  startStream,
  pauseStream,
};

