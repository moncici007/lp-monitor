const { Pool } = require('pg');

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
});

// 执行查询的辅助函数
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('执行查询', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('查询错误:', error);
    throw error;
  }
}

// 获取单个结果
async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// 获取多个结果
async function queryMany(text, params) {
  const result = await query(text, params);
  return result.rows;
}

// 执行事务
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 关闭连接池
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  queryOne,
  queryMany,
  transaction,
  close,
};

