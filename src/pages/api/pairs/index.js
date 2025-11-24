const pairRepository = require('../../../db/repositories/pairRepository');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { limit = 50, offset = 0 } = req.query;

    const pairs = await pairRepository.getRecentPairs(
      parseInt(limit),
      parseInt(offset)
    );

    const total = await pairRepository.getPairsCount();

    res.status(200).json({
      success: true,
      data: {
        pairs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('获取交易对列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取交易对列表失败',
    });
  }
}

