const alertRepository = require('../../../db/repositories/alertRepository');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PATCH') {
    return handlePatch(req, res);
  } else {
    return res.status(405).json({ error: '方法不允许' });
  }
}

// 获取警报列表
async function handleGet(req, res) {
  try {
    const { unreadOnly = 'false', limit = 50, offset = 0 } = req.query;

    let alerts;

    if (unreadOnly === 'true') {
      alerts = await alertRepository.getUnreadAlerts(parseInt(limit));
    } else {
      alerts = await alertRepository.getAllAlerts(
        parseInt(limit),
        parseInt(offset)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        alerts,
      },
    });
  } catch (error) {
    console.error('获取警报列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取警报列表失败',
    });
  }
}

// 标记警报为已读
async function handlePatch(req, res) {
  try {
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({
        success: false,
        error: '需要提供警报ID数组',
      });
    }

    await alertRepository.markMultipleAlertsAsRead(alertIds);

    res.status(200).json({
      success: true,
      message: '警报已标记为已读',
    });
  } catch (error) {
    console.error('标记警报失败:', error);
    res.status(500).json({
      success: false,
      error: '标记警报失败',
    });
  }
}

