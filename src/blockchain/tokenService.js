const { ethers } = require('ethers');
const { provider } = require('./provider');
const { ERC20_ABI } = require('../contracts/abis');
const tokenRepository = require('../db/repositories/tokenRepository');

// 获取代币信息
async function getTokenInfo(tokenAddress) {
  try {
    // 先从数据库查询
    const cachedToken = await tokenRepository.getTokenByAddress(tokenAddress);
    if (cachedToken) {
      return cachedToken;
    }

    // 从链上获取
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name().catch(() => 'Unknown'),
      tokenContract.symbol().catch(() => 'UNKNOWN'),
      tokenContract.decimals().catch(() => 18),
      tokenContract.totalSupply().catch(() => '0'),
    ]);

    // 保存到数据库
    const tokenData = {
      address: tokenAddress.toLowerCase(),
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
    };

    const savedToken = await tokenRepository.upsertToken(tokenData);
    console.log(`✅ 获取代币信息: ${symbol} (${tokenAddress})`);

    return savedToken;
  } catch (error) {
    console.error(`❌ 获取代币信息失败 ${tokenAddress}:`, error.message);
    // 返回默认值
    return {
      address: tokenAddress.toLowerCase(),
      name: 'Unknown',
      symbol: 'UNKNOWN',
      decimals: 18,
      totalSupply: '0',
    };
  }
}

// 批量获取代币信息
async function getMultipleTokenInfo(tokenAddresses) {
  const promises = tokenAddresses.map((address) => getTokenInfo(address));
  return await Promise.all(promises);
}

module.exports = {
  getTokenInfo,
  getMultipleTokenInfo,
};

