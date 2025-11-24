/**
 * QuickNode Stream 过滤器 - PancakeSwap V2 & V3 统一监控
 * 
 * 功能：
 * - 同时监控 V2 和 V3 交易对
 * - 自动识别事件版本
 * - 过滤失败的交易
 * - 返回结构化的事件数据
 * 
 * 使用方法：
 * 1. 将此函数复制到 QuickNode Dashboard 的 Stream Filter 中
 * 2. 在 MONITORED_PAIRS 数组中添加要监控的交易对地址（V2 和 V3 混合）
 */

function main(stream) {
  // ============================================================
  // 配置区域
  // ============================================================
  
  const MONITORED_PAIRS = [
    // 在此添加要监控的交易对地址（V2 或 V3，小写）
    // "0x...",
  ];
  
  // PancakeSwap V2 事件签名
  const V2_EVENTS = {
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
    BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",
    SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
  };
  
  // PancakeSwap V3 事件签名
  const V3_EVENTS = {
    SWAP: "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83",
    MINT: "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde",
    BURN: "0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c"
  };
  
  // 合并所有事件签名
  const ALL_EVENT_SIGNATURES = {
    // V2
    [V2_EVENTS.SWAP]: { type: "swap", version: "V2" },
    [V2_EVENTS.MINT]: { type: "mint", version: "V2" },
    [V2_EVENTS.BURN]: { type: "burn", version: "V2" },
    [V2_EVENTS.SYNC]: { type: "sync", version: "V2" },
    // V3
    [V3_EVENTS.SWAP]: { type: "swap", version: "V3" },
    [V3_EVENTS.MINT]: { type: "mint", version: "V3" },
    [V3_EVENTS.BURN]: { type: "burn", version: "V3" }
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
    },
    versionStats: {
      V2: 0,
      V3: 0
    }
  };
  
  const monitoringAll = MONITORED_PAIRS.length === 0;
  
  // 处理每个区块
  for (const block of stream.data) {
    const receipts = block.receipts || [];
    stats.totalReceipts += receipts.length;
    
    // 处理每个交易回执
    for (const receipt of receipts) {
      // 跳过失败的交易
      if (receipt.status !== "0x1") continue;
      
      const logs = receipt.logs || [];
      stats.totalLogs += logs.length;
      
      // 处理每个日志
      for (const log of logs) {
        const address = log.address.toLowerCase();
        const topics = log.topics || [];
        
        if (topics.length === 0) continue;
        
        const eventSignature = topics[0];
        const eventInfo = ALL_EVENT_SIGNATURES[eventSignature];
        
        if (!eventInfo) continue; // 不是我们关注的事件
        
        // 如果指定了交易对，检查地址是否匹配
        if (!monitoringAll && !MONITORED_PAIRS.includes(address)) {
          continue;
        }
        
        // 记录匹配的事件
        stats.matchedEvents++;
        stats.eventTypes[eventInfo.type]++;
        stats.versionStats[eventInfo.version]++;
        
        // 构造事件对象
        events.push({
          eventType: eventInfo.type,
          version: eventInfo.version,
          address: log.address,
          topics: log.topics,
          data: log.data,
          blockNumber: block.number,
          blockTimestamp: block.timestamp,
          transactionHash: receipt.transactionHash,
          transactionIndex: receipt.transactionIndex,
          logIndex: log.logIndex,
          removed: log.removed || false,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice
        });
      }
    }
  }
  
  // ============================================================
  // 返回结果
  // ============================================================
  
  return {
    config: {
      monitoredPairsCount: MONITORED_PAIRS.length,
      monitoringAll: monitoringAll,
      supportedVersions: ["V2", "V3"]
    },
    events: events,
    stats: stats
  };
}

