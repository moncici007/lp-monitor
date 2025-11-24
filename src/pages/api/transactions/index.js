const transactionRepository = require('../../../db/repositories/transactionRepository');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { pairAddress, limit = 50 } = req.query;

    let transactions;

    if (pairAddress) {
      transactions = await transactionRepository.getRecentTransactions(
        pairAddress.toLowerCase(),
        parseInt(limit)
      );
    } else {
      // 如果没有指定交易对，返回所有大额交易
      transactions = await transactionRepository.getLargeTransactions(
        parseInt(limit),
        24
      );
    }

    res.status(200).json({
      success: true,
      data: {
        transactions,
      },
    });
  } catch (error) {
    console.error('获取交易列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取交易列表失败',
    });
  }
}

