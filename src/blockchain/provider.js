const { ethers } = require('ethers');
require('dotenv').config();

// 创建BSC Provider
const provider = new ethers.JsonRpcProvider(
  process.env.BSC_RPC_URL || 'https://summer-solemn-pond.bsc.quiknode.pro/2d7c7a259ea0c4de731c3fad666f309c6fff111e/'
);

// 测试连接
async function testConnection() {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ BSC连接成功');
    console.log(`   网络: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`   当前区块: ${blockNumber}`);
    return true;
  } catch (error) {
    console.error('❌ BSC连接失败:', error.message);
    return false;
  }
}

// 获取区块时间戳
async function getBlockTimestamp(blockNumber) {
  const block = await provider.getBlock(blockNumber);
  return block ? new Date(block.timestamp * 1000) : null;
}

// 获取交易详情
async function getTransaction(txHash) {
  return await provider.getTransaction(txHash);
}

// 获取交易回执
async function getTransactionReceipt(txHash) {
  return await provider.getTransactionReceipt(txHash);
}

module.exports = {
  provider,
  testConnection,
  getBlockTimestamp,
  getTransaction,
  getTransactionReceipt,
};

