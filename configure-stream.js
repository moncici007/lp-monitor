#!/usr/bin/env node

/**
 * 配置和启动 QuickNode Stream
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');
const readline = require('readline');

const STREAM_ID = process.env.QUICKNODE_STREAM_ID;
const API_KEY = process.env.QUICKNODE_API_KEY;
const API_BASE = 'https://api.quicknode.com/streams/rest/v1/streams';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function configureStream() {
  console.log('🔧 QuickNode Stream 配置工具\n');
  console.log('='.repeat(60));

  // 1. 获取当前配置
  console.log('\n📡 获取当前 Stream 配置...');
  
  try {
    const response = await axios.get(`${API_BASE}/${STREAM_ID}`, {
      headers: { 'x-api-key': API_KEY }
    });

    const stream = response.data;
    console.log('\n当前配置:');
    console.log(`  ID: ${stream.id}`);
    console.log(`  名称: ${stream.name}`);
    console.log(`  状态: ${stream.status}`);
    console.log(`  网络: ${stream.network}`);
    console.log(`  数据集: ${stream.dataset}`);
    
    if (stream.destination && stream.destination.url) {
      console.log(`  Webhook URL: ${stream.destination.url}`);
    } else {
      console.log(`  Webhook URL: ❌ 未配置`);
    }

    // 2. 询问是否需要配置 Webhook
    let needsWebhook = false;
    
    if (!stream.destination || !stream.destination.url) {
      console.log('\n⚠️  检测到 Webhook 未配置');
      needsWebhook = true;
    } else {
      const answer = await question('\n是否要更新 Webhook URL? (y/n): ');
      needsWebhook = answer.toLowerCase() === 'y';
    }

    if (needsWebhook) {
      console.log('\n📝 配置 Webhook URL');
      console.log('   提示: 如果是本地开发，需要使用 ngrok 等工具暴露本地端口');
      console.log('   示例: https://your-domain.ngrok.io/streams/webhook');
      
      const webhookUrl = await question('\n请输入 Webhook URL: ');
      
      if (webhookUrl) {
        console.log('\n📡 更新 Stream 配置...');
        
        await axios.patch(
          `${API_BASE}/${STREAM_ID}`,
          {
            destination: {
              type: 'webhook',
              url: webhookUrl.trim()
            }
          },
          {
            headers: {
              'x-api-key': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Webhook 配置成功!');
      }
    }

    // 3. 询问是否启动 Stream
    if (stream.status === 'paused') {
      const answer = await question('\n是否要启动 Stream? (y/n): ');
      
      if (answer.toLowerCase() === 'y') {
        console.log('\n🚀 启动 Stream...');
        
        await axios.post(
          `${API_BASE}/${STREAM_ID}/start`,
          {},
          {
            headers: { 'x-api-key': API_KEY }
          }
        );
        
        console.log('✅ Stream 已启动!');
      }
    } else if (stream.status === 'running') {
      console.log('\n✅ Stream 已经在运行中');
    }

    // 4. 显示最终配置
    console.log('\n📋 最终配置验证...');
    const finalResponse = await axios.get(`${API_BASE}/${STREAM_ID}`, {
      headers: { 'x-api-key': API_KEY }
    });

    const finalStream = finalResponse.data;
    console.log('\n' + '='.repeat(60));
    console.log('✅ Stream 配置完成!');
    console.log('='.repeat(60));
    console.log(`  状态: ${finalStream.status}`);
    console.log(`  Webhook: ${finalStream.destination?.url || '未配置'}`);
    
    if (finalStream.status === 'running') {
      console.log('\n🎉 一切就绪! Stream 正在运行中');
      console.log('   现在可以使用 npm run monitor:streams 启动监控系统');
    } else {
      console.log('\n⚠️  提醒: Stream 当前未运行');
      console.log('   运行此脚本重新启动，或在 QuickNode Dashboard 中启动');
    }

  } catch (error) {
    console.error('\n❌ 配置失败:', error.response?.data || error.message);
  } finally {
    rl.close();
  }
}

configureStream();

