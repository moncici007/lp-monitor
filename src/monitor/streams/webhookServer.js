const express = require('express');
const bodyParser = require('body-parser');
const { handleStreamData, handleFilteredEvents } = require('./eventProcessor');

const app = express();

// 使用 body-parser 解析 JSON
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// QuickNode Streams Webhook 端点
app.post('/streams/webhook', async (req, res) => {
  try {
    console.log('\n📨 收到 Streams Webhook 数据');
    
    const payload = req.body;
    
    // 验证数据格式
    if (!payload) {
      console.error('❌ 无效的 payload 格式');
      return res.status(400).json({ error: '无效的数据格式' });
    }

    let totalEvents = 0;
    
    // 支持两种格式：
    // 格式1：数组格式 [{logs: [...]}, ...]
    // 格式2：对象格式 {events: [...], stats: {...}}
    
    if (Array.isArray(payload)) {
      // 格式1：原始的数组格式
      console.log('   格式：数组格式');
      for (const batch of payload) {
        if (batch && batch.logs && Array.isArray(batch.logs)) {
          totalEvents += batch.logs.length;
          await handleStreamData(batch);
        }
      }
    } else if (payload.events && Array.isArray(payload.events)) {
      // 格式2：从 JavaScript 过滤器返回的对象格式
      console.log('   格式：对象格式（JavaScript 过滤器）');
      totalEvents = payload.events.length;
      
      // 打印统计信息
      if (payload.stats) {
        console.log('   统计:', JSON.stringify(payload.stats, null, 2));
      }
      
      // 处理事件
      await handleFilteredEvents(payload.events);
    } else {
      console.error('❌ 未识别的数据格式');
      return res.status(400).json({ error: '未识别的数据格式' });
    }

    console.log(`✅ 处理完成，共 ${totalEvents} 个事件`);
    
    // 返回成功响应
    res.status(200).json({ 
      status: 'success',
      processed: totalEvents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 处理 Webhook 失败:', error);
    // 即使出错也返回 200，避免 QuickNode 重试
    res.status(200).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// 启动服务器
function startWebhookServer(port = 3001) {
  return new Promise((resolve) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log(`✅ Webhook 服务器启动成功`);
      console.log(`   监听端口: ${port}`);
      console.log(`   健康检查: http://localhost:${port}/health`);
      console.log(`   Webhook URL: http://localhost:${port}/streams/webhook`);
      console.log('='.repeat(60));
      resolve(server);
    });
  });
}

module.exports = {
  app,
  startWebhookServer,
};

