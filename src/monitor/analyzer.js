const pairRepository = require('../db/repositories/pairRepository');
const transactionRepository = require('../db/repositories/transactionRepository');
const liquidityRepository = require('../db/repositories/liquidityRepository');
const analyticsRepository = require('../db/repositories/analyticsRepository');
const alertRepository = require('../db/repositories/alertRepository');

// 分析单个交易对的数据
async function analyzePair(pairAddress, hoursBack = 1) {
  try {
    const pair = await pairRepository.getPairByAddress(pairAddress);
    if (!pair) {
      console.log(`⚠️  交易对不存在: ${pairAddress}`);
      return null;
    }

    // 获取小时交易统计
    const hourlyStats = await transactionRepository.getHourlyStats(pairAddress);

    // 获取流动性变化
    const liquidityStats = await liquidityRepository.getHourlyLiquidityStats(pairAddress);

    // 计算净流动性变化
    let netLiquidityToken0 = 0n;
    let netLiquidityToken1 = 0n;
    let liquidityAddCount = 0;
    let liquidityRemoveCount = 0;

    for (const stat of liquidityStats) {
      if (stat.event_type === 'mint') {
        netLiquidityToken0 += BigInt(stat.total_amount0 || 0);
        netLiquidityToken1 += BigInt(stat.total_amount1 || 0);
        liquidityAddCount += parseInt(stat.event_count || 0);
      } else if (stat.event_type === 'burn') {
        netLiquidityToken0 -= BigInt(stat.total_amount0 || 0);
        netLiquidityToken1 -= BigInt(stat.total_amount1 || 0);
        liquidityRemoveCount += parseInt(stat.event_count || 0);
      }
    }

    // 计算价格（reserve1/reserve0）
    let currentPrice = null;
    if (pair.reserve0 && pair.reserve1 && BigInt(pair.reserve0) > 0n) {
      currentPrice = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
    }

    const analysis = {
      pair: {
        address: pair.address,
        token0: pair.token0_symbol,
        token1: pair.token1_symbol,
        reserve0: pair.reserve0,
        reserve1: pair.reserve1,
        currentPrice,
      },
      hourlyStats: {
        transactionCount: parseInt(hourlyStats?.transaction_count || 0),
        volumeToken0: hourlyStats?.volume_token0 || '0',
        volumeToken1: hourlyStats?.volume_token1 || '0',
        volumeUsd: parseFloat(hourlyStats?.volume_usd || 0),
        largeTransactionCount: parseInt(hourlyStats?.large_transaction_count || 0),
      },
      liquidityStats: {
        addCount: liquidityAddCount,
        removeCount: liquidityRemoveCount,
        netToken0: netLiquidityToken0.toString(),
        netToken1: netLiquidityToken1.toString(),
      },
      alerts: [],
    };

    // 生成警报
    await generateAlerts(pair, analysis);

    console.log(`📊 分析完成: ${pair.token0_symbol}/${pair.token1_symbol}`);
    console.log(`   交易数: ${analysis.hourlyStats.transactionCount}`);
    console.log(`   流动性变化: +${liquidityAddCount} / -${liquidityRemoveCount}`);

    return analysis;
  } catch (error) {
    console.error(`❌ 分析交易对失败 ${pairAddress}:`, error.message);
    return null;
  }
}

// 生成警报
async function generateAlerts(pair, analysis) {
  try {
    const { hourlyStats, liquidityStats } = analysis;

    // 检测流动性激增
    if (liquidityStats.addCount > 10) {
      await alertRepository.createAlert({
        pairAddress: pair.address,
        alertType: 'liquidity_surge',
        severity: 'medium',
        title: '流动性激增',
        description: `过去1小时内有 ${liquidityStats.addCount} 次流动性添加`,
        metadata: { addCount: liquidityStats.addCount },
        timestamp: new Date(),
      });
    }

    // 检测异常高交易量
    if (hourlyStats.transactionCount > 100) {
      await alertRepository.createAlert({
        pairAddress: pair.address,
        alertType: 'high_volume',
        severity: 'medium',
        title: '交易量激增',
        description: `过去1小时内有 ${hourlyStats.transactionCount} 笔交易`,
        metadata: { transactionCount: hourlyStats.transactionCount },
        timestamp: new Date(),
      });
    }

    // 检测流动性持续流出
    const netLiquidity0 = BigInt(liquidityStats.netToken0);
    if (netLiquidity0 < 0n && liquidityStats.removeCount > liquidityStats.addCount) {
      await alertRepository.createAlert({
        pairAddress: pair.address,
        alertType: 'liquidity_drain',
        severity: 'high',
        title: '⚠️ 流动性持续流出',
        description: `移除(${liquidityStats.removeCount}) > 添加(${liquidityStats.addCount})`,
        metadata: {
          removeCount: liquidityStats.removeCount,
          addCount: liquidityStats.addCount,
        },
        timestamp: new Date(),
      });
    }
  } catch (error) {
    console.error('❌ 生成警报失败:', error.message);
  }
}

// 分析所有活跃的交易对
async function analyzeAllPairs(limit = 50) {
  try {
    console.log('\n📊 开始分析所有活跃交易对...');

    const pairs = await pairRepository.getRecentPairs(limit);
    console.log(`   找到 ${pairs.length} 个交易对`);

    const results = [];
    for (const pair of pairs) {
      const analysis = await analyzePair(pair.address);
      if (analysis) {
        results.push(analysis);
      }
      // 避免过快请求
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ 分析完成，共 ${results.length} 个交易对`);
    return results;
  } catch (error) {
    console.error('❌ 批量分析失败:', error.message);
    return [];
  }
}

// 更新小时级别的分析数据
async function updateHourlyAnalytics(pairAddress) {
  try {
    const now = new Date();
    const hourTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);

    const pair = await pairRepository.getPairByAddress(pairAddress);
    if (!pair) return;

    const oneHourAgo = new Date(hourTimestamp.getTime());
    const oneHourLater = new Date(hourTimestamp.getTime() + 60 * 60 * 1000);

    // 获取交易统计
    const txStats = await transactionRepository.getVolumeByTimeRange(
      pairAddress,
      oneHourAgo,
      oneHourLater
    );

    // 获取流动性统计
    const liqStats = await liquidityRepository.getLiquidityStatsByTimeRange(
      pairAddress,
      oneHourAgo,
      oneHourLater
    );

    let liquidityAddCount = 0;
    let liquidityRemoveCount = 0;
    let netLiquidityToken0 = 0n;
    let netLiquidityToken1 = 0n;

    for (const stat of liqStats) {
      if (stat.event_type === 'mint') {
        liquidityAddCount = parseInt(stat.event_count || 0);
        netLiquidityToken0 += BigInt(stat.total_amount0 || 0);
        netLiquidityToken1 += BigInt(stat.total_amount1 || 0);
      } else if (stat.event_type === 'burn') {
        liquidityRemoveCount = parseInt(stat.event_count || 0);
        netLiquidityToken0 -= BigInt(stat.total_amount0 || 0);
        netLiquidityToken1 -= BigInt(stat.total_amount1 || 0);
      }
    }

    // 计算价格
    let price = null;
    if (pair.reserve0 && pair.reserve1 && BigInt(pair.reserve0) > 0n) {
      price = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
    }

    const analyticsData = {
      pairAddress,
      hourTimestamp,
      transactionCount: parseInt(txStats?.transaction_count || 0),
      volumeToken0: txStats?.volume_token0 || '0',
      volumeToken1: txStats?.volume_token1 || '0',
      volumeUsd: txStats?.volume_usd || '0',
      largeTransactionsCount: parseInt(txStats?.large_transaction_count || 0),
      liquidityAddCount,
      liquidityRemoveCount,
      netLiquidityToken0: netLiquidityToken0.toString(),
      netLiquidityToken1: netLiquidityToken1.toString(),
      priceHigh: price,
      priceLow: price,
      priceOpen: price,
      priceClose: price,
    };

    await analyticsRepository.upsertHourlyAnalytics(analyticsData);
  } catch (error) {
    console.error(`❌ 更新小时分析数据失败 ${pairAddress}:`, error.message);
  }
}

module.exports = {
  analyzePair,
  analyzeAllPairs,
  generateAlerts,
  updateHourlyAnalytics,
};

