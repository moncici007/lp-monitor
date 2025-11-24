const liquidityRepository = require('../../../db/repositories/liquidityRepository');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { pairAddress, limit = 50, hours = 24 } = req.query;

    let events;

    if (pairAddress) {
      events = await liquidityRepository.getRecentLiquidityEvents(
        pairAddress.toLowerCase(),
        parseInt(limit)
      );
    } else {
      // 获取所有交易对的最近流动性事件
      events = await liquidityRepository.getAllRecentLiquidityEvents(
        parseInt(limit),
        parseInt(hours)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        events,
      },
    });
  } catch (error) {
    console.error('获取流动性事件失败:', error);
    res.status(500).json({
      success: false,
      error: '获取流动性事件失败',
    });
  }
}

