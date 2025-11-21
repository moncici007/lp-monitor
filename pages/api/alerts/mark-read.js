const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { alert_id, mark_all } = req.body;

    if (mark_all) {
      // 标记所有为已读
      const updateAllQuery = `
        UPDATE large_trade_alerts
        SET is_read = true
        WHERE is_read = false
        RETURNING id
      `;
      const result = await query(updateAllQuery);
      
      res.status(200).json({
        success: true,
        message: `Marked ${result.rowCount} alerts as read`,
        count: result.rowCount
      });
    } else if (alert_id) {
      // 标记单个为已读
      const updateQuery = `
        UPDATE large_trade_alerts
        SET is_read = true
        WHERE id = $1
        RETURNING *
      `;
      const result = await query(updateQuery, [alert_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Alert not found' 
        });
      }

      res.status(200).json({
        success: true,
        message: 'Alert marked as read',
        alert: result.rows[0]
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: 'Missing alert_id or mark_all parameter' 
      });
    }

  } catch (error) {
    console.error('标记预警失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark alert as read',
      message: error.message 
    });
  }
}

