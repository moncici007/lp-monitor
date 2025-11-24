#!/usr/bin/env node

/**
 * 原始 HTTP 服务器 - 手动处理 TCP 分包
 * 这是最可靠的方式来接收大数据包
 */

const http = require('http');
const { handleFilteredEvents } = require('./src/monitor/streams/eventProcessor');

const PORT = process.env.WEBHOOK_PORT || 3000;

const server = http.createServer((req, res) => {
  // 健康检查
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }));
    return;
  }

  // Webhook 处理
  if (req.method === 'POST' && req.url === '/webhook') {
    console.log('\n📨 收到 Webhook 请求');
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));

    let body = '';
    let chunks = 0;

    // 监听数据块
    req.on('data', chunk => {
      chunks++;
      body += chunk.toString();
      console.log(`   📦 收到数据块 #${chunks}: ${chunk.length} 字节`);
    });

    // 数据接收完成
    req.on('end', async () => {
      console.log(`   ✅ 数据接收完成，共 ${chunks} 个数据块，总大小: ${body.length} 字节`);

      try {
        // 解析 JSON
        const jsonData = JSON.parse(body);
        console.log('   ✅ JSON 解析成功');

        // 从 headers 中提取区块信息
        const blockNumber = req.headers['batch-start-range'] || req.headers['stream-start-range'];
        const blockTimestamp = null;

        // 处理事件
        if (jsonData.events && Array.isArray(jsonData.events)) {
          console.log(`   📊 事件数量: ${jsonData.events.length}`);

          // 补充区块信息
          const needsBlockInfo = jsonData.events.length > 0 && !jsonData.events[0].blockNumber;
          if (needsBlockInfo && blockNumber) {
            console.log(`   ⚠️  事件缺少区块信息，从 Headers 补充: ${blockNumber}`);
            jsonData.events.forEach(event => {
              event.blockNumber = blockNumber;
              event.blockTimestamp = blockTimestamp;
            });
          }

          // 统计信息
          if (jsonData.stats) {
            console.log('   统计:', JSON.stringify(jsonData.stats, null, 2));
          }

          // 处理事件
          await handleFilteredEvents(jsonData.events);
          
          console.log(`   ✅ 处理完成，共 ${jsonData.events.length} 个事件`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'success',
            processed: jsonData.events.length,
            timestamp: new Date().toISOString()
          }));
        } else {
          console.log('   ⚠️  未找到 events 数组');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'success',
            message: 'No events to process'
          }));
        }
      } catch (error) {
        console.error('   ❌ 处理失败:', error.message);
        console.error('   Raw body 前 200 字符:', body.substring(0, 200));
        
        // 即使出错也返回 200，避免 QuickNode 重试
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error',
          error: error.message 
        }));
      }
    });

    // 处理错误
    req.on('error', (error) => {
      console.error('   ❌ 请求错误:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'error',
        error: error.message 
      }));
    });
  } else {
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 原始 HTTP Webhook 服务器');
  console.log('='.repeat(60));
  console.log(`✅ 监听端口: ${PORT}`);
  console.log(`✅ 健康检查: http://localhost:${PORT}/health`);
  console.log(`✅ Webhook URL: http://localhost:${PORT}/webhook`);
  console.log('');
  console.log('特性:');
  console.log('  ✅ 手动处理 TCP 分包（最可靠）');
  console.log('  ✅ 支持无限大的数据包');
  console.log('  ✅ 详细的数据接收日志');
  console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

