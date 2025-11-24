const analyticsRepository = require('../../../db/repositories/analyticsRepository');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { limit = 10, hours = 24 } = req.query;

    const topPairs = await analyticsRepository.getTopPairsByVolume(
      parseInt(limit),
      parseInt(hours)
    );

    res.status(200).json({
      success: true,
      data: {
        topPairs,
      },
    });
  } catch (error) {
    console.error('获取热门交易对失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热门交易对失败',
    });
  }
}

