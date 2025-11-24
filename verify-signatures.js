#!/usr/bin/env node

/**
 * 验证事件签名配置是否正确
 */

const { ethers } = require('ethers');

console.log('🔍 验证事件签名配置\n');
console.log('='.repeat(60));

// 期望的签名
const EXPECTED_SIGNATURES = {
  V2: {
    SWAP: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
    MINT: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
    BURN: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
    SYNC: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
  },
  V3: {
    SWAP: '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
    MINT: '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde',
    BURN: '0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c',
  }
};

// 验证事件签名（通过计算哈希）
console.log('\n📋 验证签名哈希计算:\n');

const V2_EVENTS = {
  SWAP: 'Swap(address,uint256,uint256,uint256,uint256,address)',
  MINT: 'Mint(address,uint256,uint256)',
  BURN: 'Burn(address,uint256,uint256,address)',
  SYNC: 'Sync(uint112,uint112)',
};

const V3_EVENTS = {
  SWAP: 'Swap(address,address,int256,int256,uint160,uint128,int24)',
  MINT: 'Mint(address,address,int24,int24,uint128,uint256,uint256)',
  BURN: 'Burn(address,int24,int24,uint128,uint256,uint256)',
};

console.log('PancakeSwap V2:');
for (const [name, signature] of Object.entries(V2_EVENTS)) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(signature));
  const expected = EXPECTED_SIGNATURES.V2[name];
  const match = hash === expected;
  console.log(`  ${match ? '✅' : '❌'} ${name}`);
  console.log(`     期望: ${expected}`);
  console.log(`     计算: ${hash}`);
  if (!match) {
    console.log(`     ⚠️  签名不匹配！`);
  }
}

console.log('\nPancakeSwap V3:');
for (const [name, signature] of Object.entries(V3_EVENTS)) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(signature));
  const expected = EXPECTED_SIGNATURES.V3[name];
  const match = hash === expected;
  console.log(`  ${match ? '✅' : '❌'} ${name}`);
  console.log(`     期望: ${expected}`);
  console.log(`     计算: ${hash}`);
  if (!match) {
    console.log(`     ⚠️  签名不匹配！`);
  }
}

// 检查代码文件中的签名
console.log('\n' + '='.repeat(60));
console.log('\n📁 检查代码文件中的签名:\n');

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/monitor/streams/eventProcessor.js',
  'src/monitor/streams/streamManager.js',
];

let allCorrect = true;

for (const file of filesToCheck) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${file}`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n检查: ${file}`);
  
  // 检查 V2 签名
  const v2SwapFound = content.includes(EXPECTED_SIGNATURES.V2.SWAP);
  const v2MintFound = content.includes(EXPECTED_SIGNATURES.V2.MINT);
  const v2BurnFound = content.includes(EXPECTED_SIGNATURES.V2.BURN);
  const v2SyncFound = content.includes(EXPECTED_SIGNATURES.V2.SYNC);
  
  console.log(`  V2 Swap: ${v2SwapFound ? '✅' : '❌'}`);
  console.log(`  V2 Mint: ${v2MintFound ? '✅' : '❌'}`);
  console.log(`  V2 Burn: ${v2BurnFound ? '✅' : '❌'}`);
  console.log(`  V2 Sync: ${v2SyncFound ? '✅' : '❌'}`);
  
  // 检查 V3 签名
  const v3SwapFound = content.includes(EXPECTED_SIGNATURES.V3.SWAP);
  const v3MintFound = content.includes(EXPECTED_SIGNATURES.V3.MINT);
  const v3BurnFound = content.includes(EXPECTED_SIGNATURES.V3.BURN);
  
  console.log(`  V3 Swap: ${v3SwapFound ? '✅' : '❌'}`);
  console.log(`  V3 Mint: ${v3MintFound ? '✅' : '❌'}`);
  console.log(`  V3 Burn: ${v3BurnFound ? '✅' : '❌'}`);
  
  if (!v2SwapFound || !v2MintFound || !v2BurnFound || !v2SyncFound ||
      !v3SwapFound || !v3MintFound || !v3BurnFound) {
    allCorrect = false;
  }
}

// 检查过滤器文件
const filterFiles = [
  'quicknode-stream-filter.js',
  'quicknode-stream-filter-optimized.js',
  'quicknode-stream-filter-with-price.js',
];

console.log('\n' + '='.repeat(60));
console.log('\n📄 检查 QuickNode 过滤器文件:\n');

for (const file of filterFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${file}`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n检查: ${file}`);
  
  // 这些是 V2 过滤器
  const v2SwapFound = content.includes(EXPECTED_SIGNATURES.V2.SWAP);
  const v2MintFound = content.includes(EXPECTED_SIGNATURES.V2.MINT);
  const v2BurnFound = content.includes(EXPECTED_SIGNATURES.V2.BURN);
  const v2SyncFound = content.includes(EXPECTED_SIGNATURES.V2.SYNC);
  
  console.log(`  V2 Swap: ${v2SwapFound ? '✅' : '❌'}`);
  console.log(`  V2 Mint: ${v2MintFound ? '✅' : '❌'}`);
  console.log(`  V2 Burn: ${v2BurnFound ? '✅' : '❌'}`);
  console.log(`  V2 Sync: ${v2SyncFound ? '✅' : '❌'}`);
  
  if (!v2SwapFound || !v2MintFound || !v2BurnFound || !v2SyncFound) {
    allCorrect = false;
  }
}

// 检查 V3 过滤器
const v3FilterPath = path.join(__dirname, 'quicknode-stream-filter-v3.js');
if (fs.existsSync(v3FilterPath)) {
  const content = fs.readFileSync(v3FilterPath, 'utf8');
  
  console.log(`\n检查: quicknode-stream-filter-v3.js`);
  
  const v3SwapFound = content.includes(EXPECTED_SIGNATURES.V3.SWAP);
  const v3MintFound = content.includes(EXPECTED_SIGNATURES.V3.MINT);
  const v3BurnFound = content.includes(EXPECTED_SIGNATURES.V3.BURN);
  
  console.log(`  V3 Swap: ${v3SwapFound ? '✅' : '❌'}`);
  console.log(`  V3 Mint: ${v3MintFound ? '✅' : '❌'}`);
  console.log(`  V3 Burn: ${v3BurnFound ? '✅' : '❌'}`);
  
  if (!v3SwapFound || !v3MintFound || !v3BurnFound) {
    allCorrect = false;
  }
}

// 最终结果
console.log('\n' + '='.repeat(60));
if (allCorrect) {
  console.log('\n✅ 所有签名配置正确！');
  console.log('\n系统已准备就绪，可以正确识别 V2 和 V3 事件。');
} else {
  console.log('\n⚠️  发现签名配置问题');
  console.log('\n请检查上述标记为 ❌ 的项目。');
}
console.log('\n' + '='.repeat(60) + '\n');

