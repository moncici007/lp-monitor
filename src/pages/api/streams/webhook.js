import { handleFilteredEvents } from '../../../monitor/streams/eventProcessor';

// 禁用 Next.js 的默认 body 解析，使用自定义配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // 支持大数据包
    },
  },
};

export default async function handler(req, res) {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('\n📨 收到 Streams Webhook 数据 (Next.js)');
    console.log('   Content-Type:', req.headers['content-type']);
    console.log('   Content-Length:', req.headers['content-length']);
    
    const payload = req.body;
    
    // 从 headers 中提取区块信息（如果事件中缺少）
    const blockNumber = req.headers['batch-start-range'] || req.headers['stream-start-range'];
    const blockTimestamp = null; // Headers 中没有时间戳，需要从链上查询
    
    // 验证数据格式
    if (!payload) {
      console.error('❌ 无效的 payload');
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
          // handleStreamData 需要异步导入
          const { handleStreamData } = await import('../../../monitor/streams/eventProcessor');
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
      console.error('   Payload keys:', Object.keys(payload));
      return res.status(400).json({ error: '未识别的数据格式' });
    }

    console.log(`✅ 处理完成，共 ${totalEvents} 个事件`);
    
    // 返回成功响应
    return res.status(200).json({ 
      status: 'success',
      processed: totalEvents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 处理 Webhook 失败:', error);
    console.error('   Stack:', error.stack);
    
    // 即使出错也返回 200，避免 QuickNode 重试
    return res.status(200).json({ 
      status: 'error',
      error: error.message 
    });
  }
}

