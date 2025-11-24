#!/usr/bin/env node

/**
 * Stream 配置验证脚本
 * 使用方法：node verify-stream-config.js
 */

// 尝试加载 .env.local，如果不存在则加载 .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const axios = require('axios');

async function verifyStreamConfig() {
  console.log('🔍 QuickNode Stream 配置验证\n');
  console.log('='.repeat(60));

  // 1. 检查环境变量
  console.log('\n📋 步骤1：检查环境变量');
  console.log('-'.repeat(60));
  
  const streamId = process.env.QUICKNODE_STREAM_ID;
  const apiKey = process.env.QUICKNODE_API_KEY;
  
  console.log('QUICKNODE_STREAM_ID:', streamId ? '✅ 已设置' : '❌ 未设置');
  if (streamId) {
    console.log('  值:', streamId);
    console.log('  长度:', streamId.length, '字符');
    console.log('  格式检查:', streamId.startsWith('st_') ? '✅ 正确 (以 st_ 开头)' : '⚠️  不是标准格式');
  }
  
  console.log('\nQUICKNODE_API_KEY:', apiKey ? '✅ 已设置' : '❌ 未设置');
  if (apiKey) {
    console.log('  前8位:', apiKey.substring(0, 8) + '...');
    console.log('  长度:', apiKey.length, '字符');
    console.log('  格式检查:', apiKey.startsWith('QN_') ? '✅ 正确 (以 QN_ 开头)' : '⚠️  不是标准格式');
  }

  if (!streamId || !apiKey) {
    console.log('\n❌ 环境变量未完整配置！');
    console.log('   请检查 .env.local 文件');
    return;
  }

  // 2. 测试 API 连接
  console.log('\n📡 步骤2：测试 QuickNode API 连接');
  console.log('-'.repeat(60));
  
  const apiUrl = `https://api.quicknode.com/streams/rest/v1/streams/${streamId}`;
  console.log('请求 URL:', apiUrl);
  
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'x-api-key': apiKey,
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 600; // 不抛出错误，我们自己处理
      }
    });

    console.log('\n响应状态码:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Stream 验证成功！\n');
      console.log('Stream 详情:');
      console.log('-'.repeat(60));
      console.log('ID:', response.data.id);
      console.log('名称:', response.data.name);
      console.log('状态:', response.data.status);
      console.log('网络:', response.data.network);
      console.log('数据集:', response.data.dataset);
      console.log('区域:', response.data.region);
      
      if (response.data.destination) {
        console.log('\nWebhook 配置:');
        console.log('  类型:', response.data.destination.type);
        console.log('  URL:', response.data.destination.url);
      }
      
      if (response.data.filter_config) {
        console.log('\n过滤器配置:');
        console.log('  类型:', response.data.filter_config.type);
        if (response.data.filter_config.addresses) {
          console.log('  监听地址数:', response.data.filter_config.addresses.length);
        }
      }
      
      console.log('\n✅ 配置正确，系统应该可以正常工作！');
      
    } else if (response.status === 401) {
      console.log('❌ 认证失败 (401)');
      console.log('\n可能的原因:');
      console.log('  1. API Key 不正确');
      console.log('  2. API Key 没有 Streams 权限');
      console.log('  3. API Key 已过期或被删除');
      console.log('\n解决方案:');
      console.log('  1. 在 QuickNode Dashboard 确认 API Key');
      console.log('  2. 创建新的 API Key（确保包含 Streams 权限）');
      console.log('  3. 更新 .env.local 中的 QUICKNODE_API_KEY');
      
    } else if (response.status === 404) {
      console.log('❌ Stream 不存在 (404)');
      console.log('\n可能的原因:');
      console.log('  1. Stream ID 不正确');
      console.log('  2. Stream 已被删除');
      console.log('  3. Stream ID 中有多余的空格或字符');
      console.log('\n解决方案:');
      console.log('  1. 登录 https://dashboard.quicknode.com/streams');
      console.log('  2. 查看 Stream 列表，确认 Stream 存在');
      console.log('  3. 复制正确的 Stream ID（完整的，包括 st_ 前缀）');
      console.log('  4. 更新 .env.local 中的 QUICKNODE_STREAM_ID');
      
      console.log('\n当前配置的 Stream ID:', streamId);
      console.log('请确认这个 ID 在 Dashboard 中存在');
      
    } else {
      console.log('⚠️  收到意外状态码:', response.status);
      console.log('\n响应内容:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ 请求失败！\n');
    
    if (error.code === 'ENOTFOUND') {
      console.log('错误: 无法解析域名');
      console.log('请检查网络连接');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('错误: 请求超时');
      console.log('请检查网络连接或防火墙设置');
    } else {
      console.log('错误类型:', error.code || error.message);
      console.log('详细信息:', error.message);
    }
  }

  // 3. 检查 .env.local 文件
  console.log('\n📄 步骤3：检查 .env.local 文件');
  console.log('-'.repeat(60));
  
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local 文件存在');
    
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    
    console.log('\n相关配置行:');
    lines.forEach((line, index) => {
      if (line.includes('QUICKNODE')) {
        const lineNum = index + 1;
        console.log(`  ${lineNum}: ${line}`);
        
        // 检查是否有注释
        if (line.trim().startsWith('#')) {
          console.log('       ⚠️  这行被注释了！请移除开头的 #');
        }
        
        // 检查是否有多余的空格
        if (line.includes('  ') || line.trim() !== line) {
          console.log('       ⚠️  可能有多余的空格');
        }
      }
    });
  } else {
    console.log('❌ .env.local 文件不存在！');
    console.log('   请创建此文件并配置环境变量');
  }

  console.log('\n' + '='.repeat(60));
  console.log('验证完成！');
  console.log('='.repeat(60) + '\n');
}

// 运行验证
verifyStreamConfig().catch(error => {
  console.error('验证过程出错:', error);
  process.exit(1);
});

