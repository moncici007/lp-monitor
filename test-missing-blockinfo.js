#!/usr/bin/env node

/**
 * 测试缺少区块信息的 Webhook 数据处理
 */

const axios = require('axios');

// 模拟实际收到的 webhook 数据（缺少 blockNumber 和 blockTimestamp）
const actualWebhookData = {
  "config": {
    "monitoredPairsCount": 1,
    "monitoringAll": false
  },
  "events": [
    {
      "address": "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
      "data": "0x0000000000000000000000000000000000000000000000000001ddea334772a0000000000000000000000000000000000000000000067386a71b23e58498bb88",
      "effectiveGasPrice": "0xbebc200",
      "eventType": "sync",
      "from": "0xdd3f7fb41e39219580852804615f893ed087f6cc",
      "gasUsed": "0x1bf0e",
      "logIndex": "0xeb",
      "removed": false,
      "to": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
      "topics": ["0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"],
      "transactionHash": "0x432ac5bc3e9d7453da3e2bdf2062ea26629745258290efe5ace94765a7acc7d6",
      "transactionIndex": "0x39"
      // ❌ 注意: 没有 blockNumber 和 blockTimestamp
    },
    {
      "address": "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
      "data": "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005b6347d279084000000000000000000000000000000000000000000000000000000000001a613d41a0000000000000000000000000000000000000000000000000000000000000000",
      "effectiveGasPrice": "0xbebc200",
      "eventType": "swap",
      "from": "0xdd3f7fb41e39219580852804615f893ed087f6cc",
      "gasUsed": "0x1bf0e",
      "logIndex": "0xec",
      "removed": false,
      "to": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
      "topics": [
        "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
        "0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e",
        "0x000000000000000000000000dd3f7fb41e39219580852804615f893ed087f6cc"
      ],
      "transactionHash": "0x432ac5bc3e9d7453da3e2bdf2062ea26629745258290efe5ace94765a7acc7d6",
      "transactionIndex": "0x39"
    }
  ],
  "stats": {
    "eventTypes": {
      "burn": 0,
      "mint": 0,
      "swap": 1,
      "sync": 1
    },
    "matchedEvents": 2,
    "totalBlocks": 1,
    "totalLogs": 1516,
    "totalReceipts": 255
  }
};

// 模拟 QuickNode 的 HTTP Headers
const quicknodeHeaders = {
  'batch-start-range': '69325042',
  'batch-end-range': '69325042',
  'stream-id': '77c7177a-d8df-48b4-b8d4-49ca39c3aff7',
  'stream-name': 'test-stream',
  'stream-network': 'bnbchain-mainnet',
  'stream-dataset': 'block_with_receipts',
  'x-qn-timestamp': '1763995639',
  'content-type': 'application/json'
};

async function testWebhook() {
  console.log('🧪 测试缺少区块信息的 Webhook 数据处理\n');
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
    process.exit(1);
  }

  // 分析数据
  console.log('\n📊 步骤 2: 分析数据特征');
  console.log('-'.repeat(60));
  
  console.log('数据特征:');
  console.log(`  ✓ 事件数量: ${actualWebhookData.events.length}`);
  console.log(`  ✓ 第一个事件类型: ${actualWebhookData.events[0].eventType}`);
  console.log(`  ❌ 第一个事件有 blockNumber: ${!!actualWebhookData.events[0].blockNumber}`);
  console.log(`  ❌ 第一个事件有 blockTimestamp: ${!!actualWebhookData.events[0].blockTimestamp}`);
  console.log(`  ✓ Headers 中的区块号: ${quicknodeHeaders['batch-start-range']}`);

  // 发送测试请求（模拟 QuickNode）
  console.log('\n📤 步骤 3: 发送数据到 Webhook (模拟 QuickNode)');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.post(
      `${webhookUrl}/streams/webhook`,
      actualWebhookData,
      {
        headers: quicknodeHeaders,
        timeout: 10000
      }
    );

    console.log('✅ Webhook 处理成功!');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'success') {
      console.log('\n🎉 测试通过！事件已成功处理');
      console.log('   - 区块信息从 Headers 中自动提取');
      console.log('   - 事件已存储到数据库');
    }
    
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
  
  console.log('💡 提示:');
  console.log('  - 如果测试失败，请检查数据库连接');
  console.log('  - 查看监控系统的日志输出');
  console.log('  - 确认 eventProcessor.js 已更新');
}

// 运行测试
testWebhook().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

