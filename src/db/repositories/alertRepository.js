const db = require('../client');

// 创建警报
async function createAlert(alertData) {
  const {
    pairAddress,
    alertType,
    severity,
    title,
    description,
    metadata,
    timestamp,
  } = alertData;

  const query = `
    INSERT INTO alerts (
      pair_address, alert_type, severity, title, description, metadata, timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  return await db.queryOne(query, [
    pairAddress,
    alertType,
    severity,
    title,
    description,
    JSON.stringify(metadata),
    timestamp,
  ]);
}

// 获取未读警报
async function getUnreadAlerts(limit = 50) {
  const query = `
    SELECT a.*, p.token0_address, p.token1_address
    FROM alerts a
    JOIN pairs p ON a.pair_address = p.address
    WHERE a.is_read = false
    ORDER BY a.timestamp DESC
    LIMIT $1
  `;
  return await db.queryMany(query, [limit]);
}

// 获取所有警报
async function getAllAlerts(limit = 100, offset = 0) {
  const query = `
    SELECT a.*, p.token0_address, p.token1_address
    FROM alerts a
    JOIN pairs p ON a.pair_address = p.address
    ORDER BY a.timestamp DESC
    LIMIT $1 OFFSET $2
  `;
  return await db.queryMany(query, [limit, offset]);
}

// 标记警报为已读
async function markAlertAsRead(alertId) {
  const query = `
    UPDATE alerts SET is_read = true WHERE id = $1 RETURNING *
  `;
  return await db.queryOne(query, [alertId]);
}

// 批量标记警报为已读
async function markMultipleAlertsAsRead(alertIds) {
  const query = `
    UPDATE alerts SET is_read = true WHERE id = ANY($1)
  `;
  return await db.query(query, [alertIds]);
}

// 获取特定交易对的警报
async function getAlertsByPair(pairAddress, limit = 50) {
  const query = `
    SELECT * FROM alerts
    WHERE pair_address = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `;
  return await db.queryMany(query, [pairAddress, limit]);
}

module.exports = {
  createAlert,
  getUnreadAlerts,
  getAllAlerts,
  markAlertAsRead,
  markMultipleAlertsAsRead,
  getAlertsByPair,
};

