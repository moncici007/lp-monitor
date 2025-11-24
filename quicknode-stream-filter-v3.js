/**
 * QuickNode Stream 过滤器 - PancakeSwap V3
 * 
 * 注意：V3 的事件结构与 V2 完全不同！
 * 
 * 使用方法：
 * 1. 将此函数复制到 QuickNode Dashboard 的 Stream Filter 中
 * 2. 在 MONITORED_PAIRS 数组中添加要监控的交易对地址
 */

function main(stream) {
  // ============================================================
  // 配置区域
  // ============================================================
  
  const MONITORED_PAIRS = [
    // PancakeSwap V3 交易对地址（小写）
    // 例如: "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5"
  ];
  
  // PancakeSwap V3 事件签名
  const EVENT_SIGNATURES = {
    // V3 Swap 事件（与 V2 不同！）
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    // event Swap(address indexed sender, address indexed recipient, 
    //            int256 amount0, int256 amount1, uint160 sqrtPriceX96, 
    //            uint128 liquidity, int24 tick)
    
    // V3 Mint 事件
    MINT: "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde",
    // event Mint(address sender, address indexed owner, int24 indexed tickLower, 
    //           int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)
    
    // V3 Burn 事件
    BURN: "0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c",
    // event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, 
    //           uint128 amount, uint256 amount0, uint256 amount1)
    
    // V3 Collect 事件（收集手续费）
    COLLECT: "0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0",
    // event Collect(address indexed owner, address recipient, int24 indexed tickLower, 
    //              int24 indexed tickUpper, uint128 amount0, uint128 amount1)
  };
  
  // ============================================================
  // 数据处理
  // ============================================================
  
  const events = [];
  const stats = {
    totalBlocks: stream.data.length,
    totalReceipts: 0,
    totalLogs: 0,
    matchedEvents: 0,
    eventTypes: {
      swap: 0,
      mint: 0,
      burn: 0,
      collect: 0
    }
  };
  
  const monitoredPairsSet = new Set(
    MONITORED_PAIRS.map(addr => addr.toLowerCase())
  );
  const monitorAll = monitoredPairsSet.size === 0;
  
  // 遍历区块
  for (const block of stream.data) {
    const receipts = block.receipts || [];
    stats.totalReceipts += receipts.length;
    
    for (const receipt of receipts) {
      if (receipt.status !== "0x1") continue;
      
      const logs = receipt.logs || [];
      stats.totalLogs += logs.length;
      
      for (const log of logs) {
        const logAddress = (log.address || "").toLowerCase();
        
        const isMonitored = monitorAll || monitoredPairsSet.has(logAddress);
        if (!isMonitored) continue;
        
        const topics = log.topics || [];
        if (topics.length === 0) continue;
        
        const topic0 = topics[0];
        let eventType = null;
        
        // 匹配 V3 事件类型
        if (topic0 === EVENT_SIGNATURES.SWAP) {
          eventType = "swap";
          stats.eventTypes.swap++;
        } else if (topic0 === EVENT_SIGNATURES.MINT) {
          eventType = "mint";
          stats.eventTypes.mint++;
        } else if (topic0 === EVENT_SIGNATURES.BURN) {
          eventType = "burn";
          stats.eventTypes.burn++;
        } else if (topic0 === EVENT_SIGNATURES.COLLECT) {
          eventType = "collect";
          stats.eventTypes.collect++;
        }
        
        if (eventType) {
          stats.matchedEvents++;
          
          events.push({
            blockNumber: block.number,
            blockHash: block.hash,
            blockTimestamp: block.timestamp,
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
            logIndex: log.logIndex,
            address: log.address,
            eventType: eventType,
            topics: log.topics,
            data: log.data,
            removed: log.removed || false
          });
        }
      }
    }
  }
  
  // ============================================================
  // 返回结果
  // ============================================================
  
  return {
    version: "v3",
    events: events,
    stats: stats,
    config: {
      monitoredPairsCount: MONITORED_PAIRS.length,
      monitoringAll: MONITORED_PAIRS.length === 0
    }
  };
}

