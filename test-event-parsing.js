#!/usr/bin/env node

/**
 * 测试事件解析的健壮性
 */

console.log('🧪 测试事件数据解析\n');
console.log('='.repeat(60));

// 模拟各种数据格式
const testCases = [
  {
    name: '十六进制格式 (0x 前缀)',
    blockNumber: '0x1a2b3c',
    blockTimestamp: '0x65a1b2c3',
  },
  {
    name: '数字格式',
    blockNumber: 123456,
    blockTimestamp: 1705123456,
  },
  {
    name: '字符串数字格式',
    blockNumber: '123456',
    blockTimestamp: '1705123456',
  },
  {
    name: '混合格式',
    blockNumber: '0x1e240',
    blockTimestamp: 1705123456,
  },
];

function parseBlockNumber(blockNumber) {
  const blockNum = typeof blockNumber === 'string' && blockNumber.startsWith('0x')
    ? parseInt(blockNumber, 16)
    : typeof blockNumber === 'number'
      ? blockNumber
      : parseInt(blockNumber);

  return blockNum;
}

function parseTimestamp(blockTimestamp) {
  if (!blockTimestamp) return null;
  
  const timestampNum = typeof blockTimestamp === 'string' && blockTimestamp.startsWith('0x')
    ? parseInt(blockTimestamp, 16)
    : typeof blockTimestamp === 'number'
      ? blockTimestamp
      : parseInt(blockTimestamp);
  
  if (isNaN(timestampNum)) return null;
  
  return new Date(timestampNum * 1000);
}

console.log('\n📊 测试结果:\n');

for (const testCase of testCases) {
  console.log(`测试: ${testCase.name}`);
  console.log(`  输入 blockNumber: ${testCase.blockNumber} (${typeof testCase.blockNumber})`);
  console.log(`  输入 blockTimestamp: ${testCase.blockTimestamp} (${typeof testCase.blockTimestamp})`);
  
  const blockNum = parseBlockNumber(testCase.blockNumber);
  const timestamp = parseTimestamp(testCase.blockTimestamp);
  
  console.log(`  解析 blockNumber: ${blockNum} ${isNaN(blockNum) ? '❌' : '✅'}`);
  console.log(`  解析 timestamp: ${timestamp ? timestamp.toISOString() : 'null'} ${timestamp ? '✅' : '❌'}`);
  console.log('');
}

// 测试边界情况
console.log('=' .repeat(60));
console.log('\n🔍 测试边界情况:\n');

const edgeCases = [
  { name: 'undefined', value: undefined },
  { name: 'null', value: null },
  { name: '空字符串', value: '' },
  { name: '无效十六进制', value: '0xGGGG' },
  { name: 'NaN', value: NaN },
];

for (const edgeCase of edgeCases) {
  console.log(`测试: ${edgeCase.name}`);
  const blockNum = parseBlockNumber(edgeCase.value);
  console.log(`  结果: ${blockNum} - ${isNaN(blockNum) ? '❌ 会被捕获' : '✅'}`);
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ 解析逻辑健壮性测试完成');
console.log('\n关键点:');
console.log('  1. ✅ 支持十六进制格式 (0x 前缀)');
console.log('  2. ✅ 支持数字格式');
console.log('  3. ✅ 支持字符串数字格式');
console.log('  4. ✅ 能检测无效值 (isNaN)');
console.log('  5. ✅ 时间戳自动转换为 Date 对象');
console.log('\n' + '='.repeat(60) + '\n');

