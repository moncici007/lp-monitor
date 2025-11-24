/**
 * QuickNode Stream 过滤器 - 完整版（包含 Factory PairCreated 事件）
 * 
 * 功能：
 * - 监控 PancakeSwap Factory 的 PairCreated 事件（新交易对创建）
 * - 监控交易对的 Swap、Mint、Burn、Sync 事件
 * - 过滤失败的交易
 * - 返回结构化的事件数据
 * 
 * 使用方法：
 * 1. 将此函数复制到 QuickNode Dashboard 的 Stream Filter 中
 * 2. 配置 Stream 地址列表（包括 Factory 地址和交易对地址）
 * 3. 系统会通过 API 动态更新地址列表
 */

function main(stream) {
  // ============================================================
  // 配置区域
  // ============================================================
  
  // PancakeSwap V2 Factory 地址（必须包含，用于监听 PairCreated）
  const FACTORY_ADDRESS = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
  
  // 要监控的交易对地址列表（通过 API 动态更新）
  const MONITORED_PAIRS = [
    // 示例：添加要监控的交易对地址（小写）
    // "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
    "0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5",
    // 注意：系统会通过 streamManager.updateStreamAddresses() 动态更新
  ];
  
  // 是否监控所有交易对（如果为 true，则忽略 MONITORED_PAIRS）
  const MONITOR_ALL_PAIRS = false;
  
  // 事件签名
  const EVENT_SIGNATURES = {
    // Factory 事件
    PAIR_CREATED: "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9",
    
    // Pair 事件 (V2)
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
    BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",
    SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
  };
  
  // ============================================================
  // 处理逻辑
  // ============================================================
  
  const events = [];
  const stats = {
    totalBlocks: stream.data.length,
    totalReceipts: 0,
    totalLogs: 0,
    matchedEvents: 0,
    eventTypes: {
      pairCreated: 0,
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
  
  // 处理每个区块
  for (const block of stream.data) {
    const receipts = block.receipts || [];
    stats.totalReceipts += receipts.length;
    
    for (const receipt of receipts) {
      // 跳过失败的交易
      if (receipt.status !== "0x1") {
        continue;
      }
      
      const logs = receipt.logs || [];
      stats.totalLogs += logs.length;
      
      for (const log of logs) {
        const topic0 = log.topics[0];
        const logAddress = log.address.toLowerCase();
        
        let eventType = null;
        let shouldInclude = false;
        
        // 1. 检查是否是 Factory 的 PairCreated 事件
        if (topic0 === EVENT_SIGNATURES.PAIR_CREATED && logAddress === FACTORY_ADDRESS) {
          eventType = "pairCreated";
          shouldInclude = true;  // Factory 事件始终包含
          stats.eventTypes.pairCreated++;
        } 
        // 2. 检查是否是 Pair 事件
        else {
          // 首先检查地址是否在监控列表中（或者监控所有）
          const isPairMonitored = MONITOR_ALL_PAIRS || monitoredPairsSet.has(logAddress);
          
          if (isPairMonitored) {
            // 再检查事件类型
            if (topic0 === EVENT_SIGNATURES.SWAP) {
              eventType = "swap";
              shouldInclude = true;
              stats.eventTypes.swap++;
            } else if (topic0 === EVENT_SIGNATURES.MINT) {
              eventType = "mint";
              shouldInclude = true;
              stats.eventTypes.mint++;
            } else if (topic0 === EVENT_SIGNATURES.BURN) {
              eventType = "burn";
              shouldInclude = true;
              stats.eventTypes.burn++;
            } else if (topic0 === EVENT_SIGNATURES.SYNC) {
              eventType = "sync";
              shouldInclude = true;
              stats.eventTypes.sync++;
            }
          }
        }
        
        // 如果匹配到事件且应该包含，添加到结果
        if (eventType && shouldInclude) {
          stats.matchedEvents++;
          
          events.push({
            // 事件基本信息
            eventType: eventType,
            address: log.address,
            
            // 区块和交易信息
            blockNumber: block.number,
            blockTime: block.timestamp,
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            logIndex: log.logIndex,
            
            // 事件数据
            topics: log.topics,
            data: log.data,
            
            // 交易详情（可选）
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
            
            // 状态
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
    config: {
      factoryAddress: FACTORY_ADDRESS,
      monitoringFactory: true,
      monitoredPairsCount: MONITORED_PAIRS.length,
      monitoringAll: MONITOR_ALL_PAIRS
    },
    events: events,
    stats: stats
  };
}

