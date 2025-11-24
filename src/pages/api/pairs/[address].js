const pairRepository = require('../../../db/repositories/pairRepository');
const transactionRepository = require('../../../db/repositories/transactionRepository');
const liquidityRepository = require('../../../db/repositories/liquidityRepository');
const analyticsRepository = require('../../../db/repositories/analyticsRepository');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: '缺少交易对地址',
      });
    }

    // 获取交易对详情
    const pair = await pairRepository.getPairByAddress(address.toLowerCase());

    if (!pair) {
      return res.status(404).json({
        success: false,
        error: '交易对不存在',
      });
    }

    // 获取最近交易
    const recentTransactions = await transactionRepository.getRecentTransactions(
      address.toLowerCase(),
      20
    );

    // 获取最近流动性事件
    const recentLiquidityEvents = await liquidityRepository.getRecentLiquidityEvents(
      address.toLowerCase(),
      20
    );

    // 获取小时统计
    const hourlyStats = await transactionRepository.getHourlyStats(address.toLowerCase());

    // 获取历史分析数据（最近24小时）
    const analytics = await analyticsRepository.getAnalyticsByPair(address.toLowerCase(), 24);

    res.status(200).json({
      success: true,
      data: {
        pair,
        recentTransactions,
        recentLiquidityEvents,
        hourlyStats,
        analytics,
      },
    });
  } catch (error) {
    console.error('获取交易对详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取交易对详情失败',
    });
  }
}

