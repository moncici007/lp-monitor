require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../lib/db');

async function setupDatabase() {
  console.log('🚀 开始设置数据库...\n');
  
  try {
    // 读取 schema 文件
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 执行数据库 schema...');
    await query(schema);
    
    console.log('✅ 数据库表创建成功！\n');
    
    // 验证表是否创建成功
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const result = await query(tablesQuery);
    console.log('📊 已创建的表:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n✅ 数据库设置完成！');
    
  } catch (error) {
    console.error('❌ 数据库设置失败:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

setupDatabase();

