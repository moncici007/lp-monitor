// 健康检查端点
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok',
    service: 'LP Monitor API',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/api/streams/webhook',
      health: '/api/health'
    }
  });
}

