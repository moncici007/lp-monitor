#!/usr/bin/env node

/**
 * QuickNode Stream 更新示例
 * 
 * 根据官方 API 文档：
 * https://www.quicknode.com/docs/streams/rest-api/streams/streams-rest-update-stream
 */

require('dotenv').config();
const { updateStreamConfig, updateStreamAddresses } = require('./src/monitor/streams/streamManager');

// 示例 1: 更新完整的 Stream 配置
async function updateFullConfig() {
  console.log('='.repeat(60));
  console.log('示例 1: 更新完整的 Stream 配置');
  console.log('='.repeat(60));

  const config = {
    // 数据集批次大小
    dataset_batch_size: 1,
    
    // 包含 Stream 元数据
    include_stream_metadata: 'body',
    
    // 目标类型
    destination: 'webhook',
    
    // 区块重组处理
    fix_block_reorgs: 0,
    
    // 距离链尖的安全距离
    keep_distance_from_tip: 0,
    
    // Webhook 目标配置
    destination_attributes: {
      url: process.env.WEBHOOK_URL || 'http://localhost:3000/webhook',
      compression: 'none',
      headers: {
        'Content-Type': 'application/json',
        // 可以添加自定义 headers
      },
      max_retry: 3,
      retry_interval_sec: 1,
      post_timeout_sec: 30,
    },
    
    // Stream 状态
    status: 'active',
    
    // 过滤器配置
    filter_config: {
      type: 'logs',
      addresses: [
        '0xca143ce32fe78f1f7019d7d551a6402fc5350c73', // Factory
        // ... 其他地址
      ],
      topics: [
        '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
        '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap V2
        // ... 其他事件
      ],
    },
  };

  const result = await updateStreamConfig(config);
  
  if (result) {
    console.log('✅ Stream 配置更新成功！');
    console.log('返回数据:', JSON.stringify(result, null, 2));
  } else {
    console.log('❌ Stream 配置更新失败');
  }
}

// 示例 2: 只更新地址列表（使用便捷函数）
async function updateAddressesList() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 2: 只更新地址列表');
  console.log('='.repeat(60));

  const pairAddresses = [
    '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
    '0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5',
  ];

  const success = await updateStreamAddresses(pairAddresses, true);
  
  if (success) {
    console.log('✅ 地址列表更新成功！');
  } else {
    console.log('❌ 地址列表更新失败');
  }
}

// 示例 3: 更新 Webhook URL
async function updateWebhookUrl() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 3: 更新 Webhook URL');
  console.log('='.repeat(60));

  const config = {
    destination_attributes: {
      url: 'https://your-new-domain.com/webhook',
      compression: 'none',
      max_retry: 3,
      retry_interval_sec: 1,
      post_timeout_sec: 30,
    },
  };

  const result = await updateStreamConfig(config);
  
  if (result) {
    console.log('✅ Webhook URL 更新成功！');
  } else {
    console.log('❌ Webhook URL 更新失败');
  }
}

// 示例 4: 更新 Stream 状态（暂停/激活）
async function updateStreamStatus(status) {
  console.log('\n' + '='.repeat(60));
  console.log(`示例 4: 更新 Stream 状态为 ${status}`);
  console.log('='.repeat(60));

  const config = {
    status: status, // 'active' 或 'paused'
  };

  const result = await updateStreamConfig(config);
  
  if (result) {
    console.log(`✅ Stream 状态更新为 ${status}！`);
  } else {
    console.log('❌ Stream 状态更新失败');
  }
}

// 示例 5: 更新过滤器函数（Base64 编码）
async function updateFilterFunction() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 5: 更新过滤器函数');
  console.log('='.repeat(60));

  // 方法 1: 手动编写过滤器
  const filterCode = `
function main(stream) {
  const MONITORED_ADDRESSES = new Set([
    '0xca143ce32fe78f1f7019d7d551a6402fc5350c73', // Factory
    '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
  ]);
  
  const EVENT_TOPICS = new Set([
    '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap
  ]);
  
  const events = [];
  for (const block of stream.data) {
    for (const receipt of block.receipts || []) {
      if (receipt.status === "0x1") {
        for (const log of receipt.logs || []) {
          const address = log.address.toLowerCase();
          const topic0 = log.topics[0];
          if (MONITORED_ADDRESSES.has(address) && EVENT_TOPICS.has(topic0)) {
            events.push({
              address: log.address,
              topics: log.topics,
              data: log.data,
              logIndex: log.logIndex,
              transactionHash: receipt.transactionHash,
            });
          }
        }
      }
    }
  }
  return { events };
}
  `.trim();

  const base64Filter = Buffer.from(filterCode).toString('base64');

  const config = {
    filter_function: base64Filter,
  };

  const result = await updateStreamConfig(config);
  
  if (result) {
    console.log('✅ 过滤器函数更新成功！');
    console.log('   监听 Factory + 1 个交易对');
  } else {
    console.log('❌ 过滤器函数更新失败');
  }
}

// 示例 6: 使用 generateFilterFunction 更新
async function updateFilterFunctionAuto() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 6: 使用自动生成的过滤器函数');
  console.log('='.repeat(60));

  const { generateFilterFunction } = require('./src/monitor/streams/streamManager');

  const addresses = [
    '0xca143ce32fe78f1f7019d7d551a6402fc5350c73', // Factory
    '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
    '0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5',
  ];

  const topics = [
    '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9', // PairCreated
    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Swap V2
    '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // Mint V2
  ];

  const filterFunction = generateFilterFunction(addresses, topics);

  const result = await updateStreamConfig({
    filter_function: filterFunction,
  });

  if (result) {
    console.log('✅ 过滤器函数更新成功（自动生成）！');
    console.log(`   监听 ${addresses.length} 个地址`);
    console.log(`   监听 ${topics.length} 个事件类型`);
  } else {
    console.log('❌ 过滤器函数更新失败');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || '2'; // 默认运行示例 2

  try {
    switch (example) {
      case '1':
        await updateFullConfig();
        break;
      case '2':
        await updateAddressesList();
        break;
      case '3':
        await updateWebhookUrl();
        break;
      case '4':
        const status = args[1] || 'active';
        await updateStreamStatus(status);
        break;
      case '5':
        await updateFilterFunction();
        break;
      case '6':
        await updateFilterFunctionAuto();
        break;
      case 'all':
        await updateAddressesList();
        // 可以添加更多示例
        break;
      default:
        console.log('用法: node update-stream-example.js [示例编号]');
        console.log('');
        console.log('可用示例:');
        console.log('  1  - 更新完整的 Stream 配置');
        console.log('  2  - 只更新地址列表（默认）');
        console.log('  3  - 更新 Webhook URL');
        console.log('  4  - 更新 Stream 状态（active/paused）');
        console.log('  5  - 更新过滤器函数（手动）');
        console.log('  6  - 更新过滤器函数（自动生成）');
        console.log('  all - 运行所有示例');
        console.log('');
        console.log('示例:');
        console.log('  node update-stream-example.js 2');
        console.log('  node update-stream-example.js 4 paused');
        console.log('  node update-stream-example.js 6');
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = {
  updateFullConfig,
  updateAddressesList,
  updateWebhookUrl,
  updateStreamStatus,
  updateFilterFunction,
  updateFilterFunctionAuto,
};

