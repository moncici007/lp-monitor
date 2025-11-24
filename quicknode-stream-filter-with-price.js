/**
 * QuickNode Stream 过滤器 - 带价格计算
 * 
 * 特点：
 * - 在过滤器中解析事件数据
 * - 计算交易金额和价格
 * - 识别大额交易
 * - 减少后端处理负担
 */

function main(stream) {
  // ============================================================
  // 配置
  // ============================================================
  
  const MONITORED_PAIRS = [];
  
  // PancakeSwap V2 事件签名
  const EVENTS = {
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822", // V2 Swap
    MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f", // V2 Mint
    BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496", // V2 Burn
    SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"  // Sync
  };
  
  // 大额交易阈值（以 token 数量计，需根据实际情况调整）
  const LARGE_SWAP_THRESHOLD = BigInt("1000000000000000000"); // 1 token (18 decimals)
  
  // ============================================================
  // 辅助函数
  // ============================================================
  
  // 将十六进制转换为 BigInt
  function hexToBigInt(hex) {
    if (!hex || hex === "0x") return BigInt(0);
    return BigInt(hex);
  }
  
  // 解析 Swap 事件数据
  function parseSwapData(topics, data) {
    try {
      // topics[1] = sender (indexed)
      // topics[2] = to (indexed)
      // data 包含: amount0In, amount1In, amount0Out, amount1Out (各32字节)
      
      const sender = "0x" + topics[1].slice(26);
      const to = "0x" + topics[2].slice(26);
      
      // 解析 data（去掉 0x，每64个字符是一个 uint256）
      const cleanData = data.slice(2);
      const amount0In = hexToBigInt("0x" + cleanData.slice(0, 64));
      const amount1In = hexToBigInt("0x" + cleanData.slice(64, 128));
      const amount0Out = hexToBigInt("0x" + cleanData.slice(128, 192));
      const amount1Out = hexToBigInt("0x" + cleanData.slice(192, 256));
      
      // 判断交易方向（买入还是卖出 token0）
      const isBuyToken0 = amount0Out > 0;
      const volume0 = isBuyToken0 ? amount0Out : amount0In;
      const volume1 = isBuyToken0 ? amount1In : amount1Out;
      
      // 判断是否为大额交易
      const isLarge = volume0 >= LARGE_SWAP_THRESHOLD || 
                     volume1 >= LARGE_SWAP_THRESHOLD;
      
      return {
        sender,
        to,
        amount0In: amount0In.toString(),
        amount1In: amount1In.toString(),
        amount0Out: amount0Out.toString(),
        amount1Out: amount1Out.toString(),
        direction: isBuyToken0 ? "buy" : "sell",
        isLarge
      };
    } catch (e) {
      return null;
    }
  }
  
  // 解析 Mint 事件数据
  function parseMintData(topics, data) {
    try {
      const sender = "0x" + topics[1].slice(26);
      const cleanData = data.slice(2);
      const amount0 = hexToBigInt("0x" + cleanData.slice(0, 64));
      const amount1 = hexToBigInt("0x" + cleanData.slice(64, 128));
      
      return {
        sender,
        amount0: amount0.toString(),
        amount1: amount1.toString()
      };
    } catch (e) {
      return null;
    }
  }
  
  // 解析 Burn 事件数据
  function parseBurnData(topics, data) {
    try {
      const sender = "0x" + topics[1].slice(26);
      const to = "0x" + topics[2].slice(26);
      const cleanData = data.slice(2);
      const amount0 = hexToBigInt("0x" + cleanData.slice(0, 64));
      const amount1 = hexToBigInt("0x" + cleanData.slice(64, 128));
      
      return {
        sender,
        to,
        amount0: amount0.toString(),
        amount1: amount1.toString()
      };
    } catch (e) {
      return null;
    }
  }
  
  // 解析 Sync 事件数据
  function parseSyncData(data) {
    try {
      const cleanData = data.slice(2);
      const reserve0 = hexToBigInt("0x" + cleanData.slice(0, 64));
      const reserve1 = hexToBigInt("0x" + cleanData.slice(64, 128));
      
      return {
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString()
      };
    } catch (e) {
      return null;
    }
  }
  
  // ============================================================
  // 主处理逻辑
  // ============================================================
  
  const results = [];
  const pairsSet = new Set(MONITORED_PAIRS.map(a => a.toLowerCase()));
  const monitorAll = pairsSet.size === 0;
  
  for (const block of stream.data) {
    for (const receipt of block.receipts || []) {
      if (receipt.status !== "0x1") continue;
      
      for (const log of receipt.logs || []) {
        const addr = (log.address || "").toLowerCase();
        if (!monitorAll && !pairsSet.has(addr)) continue;
        
        const topics = log.topics || [];
        const topic0 = topics[0];
        if (!topic0) continue;
        
        let eventType = null;
        let parsed = null;
        
        // 解析不同类型的事件
        if (topic0 === EVENTS.SWAP) {
          eventType = "swap";
          parsed = parseSwapData(topics, log.data);
        } else if (topic0 === EVENTS.MINT) {
          eventType = "mint";
          parsed = parseMintData(topics, log.data);
        } else if (topic0 === EVENTS.BURN) {
          eventType = "burn";
          parsed = parseBurnData(topics, log.data);
        } else if (topic0 === EVENTS.SYNC) {
          eventType = "sync";
          parsed = parseSyncData(log.data);
        }
        
        if (!eventType || !parsed) continue;
        
        // 构造结果
        results.push({
          blockNumber: block.number,
          blockTimestamp: block.timestamp,
          transactionHash: receipt.transactionHash,
          logIndex: log.logIndex,
          pairAddress: log.address,
          eventType: eventType,
          ...parsed,
          gasUsed: receipt.gasUsed,
          gasPrice: receipt.effectiveGasPrice
        });
      }
    }
  }
  
  // ============================================================
  // 返回结果
  // ============================================================
  
  // 统计信息
  const stats = {
    total: results.length,
    swaps: results.filter(e => e.eventType === "swap").length,
    mints: results.filter(e => e.eventType === "mint").length,
    burns: results.filter(e => e.eventType === "burn").length,
    syncs: results.filter(e => e.eventType === "sync").length,
    largeSwaps: results.filter(e => e.eventType === "swap" && e.isLarge).length
  };
  
  return {
    events: results,
    stats: stats
  };
}

