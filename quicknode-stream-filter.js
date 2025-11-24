/**
 * QuickNode Stream 过滤器 - PancakeSwap V2 流动性池监控
 * 
 * 功能：
 * - 监控指定交易对的 Swap、Mint、Burn、Sync 事件
 * - 过滤失败的交易
 * - 返回结构化的事件数据
 * 
 * 使用方法：
 * 1. 将此函数复制到 QuickNode Dashboard 的 Stream Filter 中
 * 2. 在 MONITORED_PAIRS 数组中添加要监控的交易对地址
 */

function main(stream) {
  // ============================================================
  // 配置区域 - 在此添加要监控的交易对地址
  // ============================================================
  
  const MONITORED_PAIRS = [
    // 示例：添加您要监控的交易对地址（小写）
    // "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
    // "0x...", 
    // 注意：系统会通过 API 动态更新这个列表
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  ];
  
  // PancakeSwap V2 事件签名（与 Uniswap V2 相同）
  const EVENT_SIGNATURES = {
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f", 
    BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",
    SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
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
      sync: 0
    }
  };
  
  // 将监控地址转换为 Set 以提高查找效率
  const monitoredPairsSet = new Set(
    MONITORED_PAIRS.map(addr => addr.toLowerCase())
  );
  
  // 遍历区块
  for (const block of stream.data) {
    const receipts = block.receipts || [];
    stats.totalReceipts += receipts.length;
    
    // 遍历交易回执
    for (const receipt of receipts) {
      // 只处理成功的交易
      if (receipt.status !== "0x1") {
        continue;
      }
      
      const logs = receipt.logs || [];
      stats.totalLogs += logs.length;
      
      // 遍历日志
      for (const log of logs) {
        const logAddress = (log.address || "").toLowerCase();
        
        // 检查是否是我们监控的交易对
        // 如果 MONITORED_PAIRS 为空，则监控所有匹配事件签名的日志
        const isMonitored = monitoredPairsSet.size === 0 || 
                           monitoredPairsSet.has(logAddress);
        
        if (!isMonitored) {
          continue;
        }
        
        // 检查事件类型
        const topics = log.topics || [];
        if (topics.length === 0) {
          continue;
        }
        
        const topic0 = topics[0];
        let eventType = null;
        
        // 匹配事件类型
        if (topic0 === EVENT_SIGNATURES.SWAP) {
          eventType = "swap";
          stats.eventTypes.swap++;
        } else if (topic0 === EVENT_SIGNATURES.MINT) {
          eventType = "mint";
          stats.eventTypes.mint++;
        } else if (topic0 === EVENT_SIGNATURES.BURN) {
          eventType = "burn";
          stats.eventTypes.burn++;
        } else if (topic0 === EVENT_SIGNATURES.SYNC) {
          eventType = "sync";
          stats.eventTypes.sync++;
        }
        
        // 如果匹配到事件，添加到结果中
        if (eventType) {
          stats.matchedEvents++;
          
          events.push({
            // 区块信息
            blockNumber: block.number,
            blockHash: block.hash,
            blockTimestamp: block.timestamp,
            
            // 交易信息
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
            
            // 日志信息
            logIndex: log.logIndex,
            address: log.address,
            
            // 事件数据
            eventType: eventType,
            topics: log.topics,
            data: log.data,
            
            // 元数据
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
    // 匹配的事件
    events: events,
    
    // 统计信息
    stats: stats,
    
    // 配置信息（用于调试）
    config: {
      monitoredPairsCount: MONITORED_PAIRS.length,
      monitoringAll: MONITORED_PAIRS.length === 0
    }
  };
}

