#!/usr/bin/env node

/**
 * 测试实际的 Webhook 数据处理
 */

const axios = require('axios');

// 您实际收到的 webhook 数据
const actualWebhookData = {
  "config": {
    "monitoredPairsCount": 1,
    "monitoringAll": false
  },
  "events": [
    {
      "address": "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
      "data": "0x0000000000000000000000000000000000000000000000000001e76c5994a7f100000000000000000000000000000000000000000006d3c94936ef5129a25829",
      "effectiveGasPrice": "0x3dfd240",
      "eventType": "sync",
      "from": "0x978706927cc92032ec52e2db7f08cce7f90c038c",
      "gasUsed": "0x4032d",
      "logIndex": "0x193",
      "removed": false,
      "to": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
      "topics": [
        "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
      ],
      "transactionHash": "0x7c5620a5cb8d549a44a8c4475bb9f2f367d6394a61dc51239e871a6ffe584bb5",
      "transactionIndex": "0x4d"
    },
    {
      "address": "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
      "data": "0x0000000000000000000000000000000000000000000000000000000000618ca800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000015cea4475abecab",
      "effectiveGasPrice": "0x3dfd240",
      "eventType": "swap",
      "from": "0x978706927cc92032ec52e2db7f08cce7f90c038c",
      "gasUsed": "0x4032d",
      "logIndex": "0x194",
      "removed": false,
      "to": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
      "topics": [
        "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
        "0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e",
        "0x0000000000000000000000001e92d477473295e9f3b0f630f010b4ef8658da94"
      ],
      "transactionHash": "0x7c5620a5cb8d549a44a8c4475bb9f2f367d6394a61dc51239e871a6ffe584bb5",
      "transactionIndex": "0x4d"
    }
  ],
  "stats": {
    "eventTypes": {
      "burn": 0,
      "mint": 0,
      "swap": 2,
      "sync": 2
    },
    "matchedEvents": 4,
    "totalBlocks": 1,
    "totalLogs": 1251,
    "totalReceipts": 147
  }
};

async function testWebhook() {
  console.log('🧪 测试实际的 Webhook 数据处理\n');
  console.log('='.repeat(60));
  
  // 检查 webhook 服务是否运行
  console.log('\n📡 步骤 1: 检查 Webhook 服务状态');
  console.log('-'.repeat(60));
  
  const webhookUrl = 'http://localhost:3001';
  
  try {
    const healthCheck = await axios.get(`${webhookUrl}/health`, { timeout: 3000 });
    console.log('✅ Webhook 服务正在运行');
    console.log(`   响应: ${JSON.stringify(healthCheck.data)}`);
  } catch (error) {
    console.log('❌ Webhook 服务未运行');
    console.log('   请先启动服务: npm run monitor:streams');
    console.log('   或单独启动 webhook: node src/monitor/streams/webhookServer.js');
    process.exit(1);
  }

  // 分析数据
  console.log('\n📊 步骤 2: 分析数据格式');
  console.log('-'.repeat(60));
  
  console.log('数据格式:');
  console.log(`  ✓ 包含 events 数组: ${Array.isArray(actualWebhookData.events)}`);
  console.log(`  ✓ 事件数量: ${actualWebhookData.events.length}`);
  console.log(`  ✓ 包含统计信息: ${!!actualWebhookData.stats}`);
  
  console.log('\n事件类型分布:');
  for (const [type, count] of Object.entries(actualWebhookData.stats.eventTypes)) {
    if (count > 0) {
      console.log(`  ✓ ${type}: ${count} 个`);
    }
  }

  // 分析事件签名
  console.log('\n事件签名分析:');
  const signatures = {};
  for (const event of actualWebhookData.events) {
    const sig = event.topics[0];
    const type = event.eventType;
    if (!signatures[type]) {
      signatures[type] = [];
    }
    if (!signatures[type].includes(sig)) {
      signatures[type].push(sig);
    }
  }
  
  for (const [type, sigs] of Object.entries(signatures)) {
    console.log(`  ${type}:`);
    for (const sig of sigs) {
      const version = identifyVersion(type, sig);
      console.log(`    ${sig} (${version})`);
    }
  }

  // 发送测试请求
  console.log('\n📤 步骤 3: 发送数据到 Webhook');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.post(
      `${webhookUrl}/streams/webhook`,
      actualWebhookData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log('✅ Webhook 处理成功!');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应:`, JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Webhook 处理失败');
    
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误信息:`, error.response.data);
    } else {
      console.log(`   错误: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成!');
  console.log('='.repeat(60) + '\n');
}

function identifyVersion(eventType, signature) {
  const V2_SIGNATURES = {
    swap: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
    mint: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
    burn: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
    sync: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
  };

  const V3_SIGNATURES = {
    swap: '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
    mint: '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde',
    burn: '0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c',
  };

  if (V2_SIGNATURES[eventType] === signature) {
    return 'PancakeSwap V2';
  } else if (V3_SIGNATURES[eventType] === signature) {
    return 'PancakeSwap V3';
  } else {
    return '未知版本';
  }
}

// 运行测试
testWebhook().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

