#!/usr/bin/env node

/**
 * Webhook 测试脚本
 * 使用方法：node test-webhook.js
 */

const axios = require('axios');

// 测试数据（您实际收到的格式）
const testData = {
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
      "transactionIndex": "0x4d",
      "blockNumber": "0x123456",
      "blockTimestamp": "0x65abc123"
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
      "transactionIndex": "0x4d",
      "blockNumber": "0x123456",
      "blockTimestamp": "0x65abc123"
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
    "totalLogs": 1251,
    "totalReceipts": 147
  }
};

async function testWebhook() {
  console.log('🧪 测试 Webhook 端点...\n');

  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3001/streams/webhook';
  
  console.log(`📡 目标 URL: ${webhookUrl}`);
  console.log(`📦 发送数据: ${testData.events.length} 个事件\n`);

  try {
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ 请求成功！');
    console.log('   状态码:', response.status);
    console.log('   响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 请求失败！');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   无法连接到服务器');
      console.error('   请确保监控服务正在运行: npm run monitor:streams');
    } else {
      console.error('   错误:', error.message);
    }
  }
}

testWebhook();

