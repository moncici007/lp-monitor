/**
 * QuickNode Stream 过滤器 - 优化版
 * 
 * 特点：
 * - 减少不必要的数据传输
 * - 只返回关键字段
 * - 支持按事件类型过滤
 * - 自动跳过 Sync 事件以减少数据量（可选）
 */

function main(stream) {
  // ============================================================
  // 配置
  // ============================================================
  
  // 要监控的交易对地址（小写）
  const MONITORED_PAIRS = [
    // 在此添加地址，留空则监控所有交易对
  ];
  
  // PancakeSwap V2 事件签名
  const EVENTS = {
    SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822", // V2 Swap
    MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f", // V2 Mint
    BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496", // V2 Burn
    SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"  // Sync
  };
  
  // 选项：是否包含 Sync 事件（Sync 事件频繁，可能导致数据量大）
  const INCLUDE_SYNC = true;
  
  // 选项：只监控指定事件类型
  const ENABLED_EVENTS = {
    swap: true,   // 交易事件
    mint: true,   // 添加流动性
    burn: true,   // 移除流动性
    sync: INCLUDE_SYNC  // 价格同步
  };
  
  // ============================================================
  // 处理逻辑
  // ============================================================
  
  const results = [];
  const pairsSet = new Set(MONITORED_PAIRS.map(a => a.toLowerCase()));
  const monitorAll = pairsSet.size === 0;
  
  // 遍历区块
  for (const block of stream.data) {
    for (const receipt of block.receipts || []) {
      // 只处理成功的交易
      if (receipt.status !== "0x1") continue;
      
      for (const log of receipt.logs || []) {
        // 检查地址
        const addr = (log.address || "").toLowerCase();
        if (!monitorAll && !pairsSet.has(addr)) continue;
        
        // 检查事件类型
        const topic = (log.topics || [])[0];
        if (!topic) continue;
        
        let type = null;
        if (topic === EVENTS.SWAP && ENABLED_EVENTS.swap) {
          type = "swap";
        } else if (topic === EVENTS.MINT && ENABLED_EVENTS.mint) {
          type = "mint";
        } else if (topic === EVENTS.BURN && ENABLED_EVENTS.burn) {
          type = "burn";
        } else if (topic === EVENTS.SYNC && ENABLED_EVENTS.sync) {
          type = "sync";
        }
        
        if (!type) continue;
        
        // 只返回必要的字段
        results.push({
          // 最小化数据结构
          bn: block.number,           // 区块号
          bt: block.timestamp,        // 区块时间戳
          tx: receipt.transactionHash, // 交易哈希
          li: log.logIndex,           // 日志索引
          ad: log.address,            // 交易对地址
          tp: type,                   // 事件类型
          ts: log.topics,             // Topics
          dt: log.data,               // Data
          gp: receipt.effectiveGasPrice, // Gas Price
          gu: receipt.gasUsed,        // Gas Used
          fr: receipt.from            // 发送者
        });
      }
    }
  }
  
  return {
    events: results,
    count: results.length
  };
}

