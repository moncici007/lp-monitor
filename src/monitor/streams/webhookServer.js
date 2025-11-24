const express = require('express');
const { handleStreamData, handleFilteredEvents } = require('./eventProcessor');

const app = express();

// 禁用 Express 的自动解析，手动处理
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    // 保存原始 buffer 用于调试
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// QuickNode Streams Webhook 端点
app.post('/streams/webhook', async (req, res) => {
  try {
    console.log('\n📨 收到 Streams Webhook 数据');
    console.log('   Content-Type:', req.headers['content-type']);
    console.log('   Content-Encoding:', req.headers['content-encoding']);
    console.log('   Content-Length:', req.headers['content-length']);
    console.log('   Accept-Encoding:', req.headers['accept-encoding']);
    
    const payload = req.body;
    
    // 从 headers 中提取区块信息（如果事件中缺少）
    const blockNumber = req.headers['batch-start-range'] || req.headers['stream-start-range'];
    const blockTimestamp = null; // Headers 中没有时间戳，需要从链上查询
    
    // 调试：检查 body 是否为空
    if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      console.error('❌ req.body 为空或无效！');
      console.error('   原始 body 长度:', req.rawBody ? req.rawBody.length : 0);
      console.error('   原始 body 前100字符:', req.rawBody ? req.rawBody.substring(0, 100) : 'N/A');
      
      // 尝试手动解析
      if (req.rawBody) {
        try {
          const parsed = JSON.parse(req.rawBody);
          console.log('✅ 手动解析成功，使用手动解析的数据');
          req.body = parsed;
          // 继续处理，不返回错误
        } catch (error) {
          console.error('❌ 手动解析失败:', error.message);
          return res.status(400).json({ error: 'Cannot parse request body' });
        }
      } else {
        console.error('   可能的原因:');
        console.error('   1. Content-Type 不正确');
        console.error('   2. 请求体真的为空');
        console.error('   3. 编码问题');
        return res.status(400).json({ error: 'Empty request body' });
      }
    }
    
    // 调试：打印接收到的数据类型和键
    console.log('   Payload 类型:', typeof payload);
    console.log('   是否为数组:', Array.isArray(payload));
    if (payload && typeof payload === 'object') {
      console.log('   Payload 的键:', Object.keys(payload));
      console.log('   有 events 属性:', 'events' in payload);
      console.log('   events 是数组:', Array.isArray(payload.events));
    }
    
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
      console.log('   ✅ 匹配格式1：数组格式');
      for (const batch of payload) {
        if (batch && batch.logs && Array.isArray(batch.logs)) {
          totalEvents += batch.logs.length;
          await handleStreamData(batch);
        }
      }
    } else if (payload.events && Array.isArray(payload.events)) {
      // 格式2：从 JavaScript 过滤器返回的对象格式
      console.log('   ✅ 匹配格式2：对象格式（JavaScript 过滤器）');
      totalEvents = payload.events.length;
      
      // 打印统计信息
      if (payload.stats) {
        console.log('   统计:', JSON.stringify(payload.stats, null, 2));
      }
      
      // 检查事件是否缺少区块信息
      const needsBlockInfo = payload.events.length > 0 && !payload.events[0].blockNumber;
      
      if (needsBlockInfo && blockNumber) {
        console.log(`   ⚠️  事件缺少区块信息，从 Headers 补充: ${blockNumber}`);
        // 为每个事件添加区块信息
        payload.events.forEach(event => {
          event.blockNumber = blockNumber;
          event.blockTimestamp = blockTimestamp;
        });
      }
      
      // 处理事件
      await handleFilteredEvents(payload.events);
    } else {
      console.error('❌ 未识别的数据格式');
      console.error('   Payload 示例:', JSON.stringify(payload).slice(0, 200));
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

