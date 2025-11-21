const { Connection, PublicKey } = require('@solana/web3.js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const {
  getOrCreatePool,
  insertTransaction,
  updatePoolReserves,
  upsertHourlyStats,
  createAlert,
  updateMonitorStatus
} = require('../db');

// Raydium 程序 ID
const RAYDIUM_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

class SolanaMonitor {
  constructor() {
    this.connection = null;
    this.subscriptions = new Map();
    this.poolData = new Map();
    this.isRunning = false;
  }

  // 初始化 Solana 连接
  async initialize() {
    console.log('🔗 初始化 Solana 监控服务...');
    
    try {
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      
      const connectionConfig = {
        commitment: 'confirmed',
        wsEndpoint: process.env.SOLANA_WSS_URL
      };
      
      // 注意：Solana 的代理支持比较复杂
      // 如果需要使用代理访问 Solana，建议：
      // 1. 使用全局代理（系统级别）
      // 2. 或使用不需要代理的 RPC 节点
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      if (proxyUrl) {
        console.log(`⚠️  检测到代理配置: ${proxyUrl}`);
        console.log(`⚠️  注意: Solana 监控可能不支持 HTTP 代理`);
        console.log(`💡 建议: 使用系统级代理或不需要代理的 Solana RPC 节点`);
      }
      
      this.connection = new Connection(rpcUrl, connectionConfig);
      
      // 测试连接
      const version = await this.connection.getVersion();
      console.log(`✅ 连接成功！Solana 版本: ${version['solana-core']}`);
      
      const slot = await this.connection.getSlot();
      console.log(`✅ 当前 slot: ${slot}`);
      
      return true;
    } catch (error) {
      console.error('❌ Solana 连接失败:', error.message);
      console.log('💡 提示: 如果使用代理，Solana 可能需要特殊配置');
      console.log('💡 临时解决方案: 在 .env 中注释掉 SOLANA_POOL_ADDRESSES 来禁用 Solana 监控');
      return false;
    }
  }

  // 初始化池子数据
  async initializePool(poolAddress) {
    console.log(`\n📊 初始化 Solana 池子: ${poolAddress}`);
    
    try {
      const pubkey = new PublicKey(poolAddress);
      
      // 获取账户信息
      const accountInfo = await this.connection.getAccountInfo(pubkey);
      
      if (!accountInfo) {
        throw new Error('池子不存在');
      }
      
      // 解析池子数据（这里简化处理，实际需要根据 Raydium 的数据结构解析）
      // 在实际应用中，需要使用 @raydium-io/raydium-sdk 来解析
      
      // 存储到数据库
      const poolData = {
        chain: 'solana',
        dex: 'raydium', // 或 'orca' 根据实际情况
        pool_address: poolAddress.toLowerCase(),
        token0_address: 'pending', // 需要从账户数据解析
        token0_symbol: 'TOKEN0',
        token0_decimals: 9,
        token1_address: 'pending',
        token1_symbol: 'TOKEN1',
        token1_decimals: 9
      };
      
      const pool = await getOrCreatePool(poolData);
      
      // 缓存池子数据
      this.poolData.set(poolAddress.toLowerCase(), {
        ...pool,
        pubkey
      });
      
      console.log(`✅ Solana 池子初始化完成`);
      
      return pool;
    } catch (error) {
      console.error(`❌ Solana 池子初始化失败 ${poolAddress}:`, error.message);
      throw error;
    }
  }

  // 解析 Raydium 交易日志
  async parseRaydiumLogs(poolAddress, logs, signature, slot) {
    try {
      const pool = this.poolData.get(poolAddress.toLowerCase());
      if (!pool) return;
      
      // 获取交易详情
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!transaction || !transaction.meta) return;
      
      // 获取区块时间
      const blockTime = transaction.blockTime;
      const timestamp = new Date(blockTime * 1000);
      
      // 解析日志以确定事件类型
      // 这里简化处理，实际需要详细解析 Raydium 的指令数据
      let eventType = 'swap';
      let amount0In = 0, amount1In = 0, amount0Out = 0, amount1Out = 0;
      
      // 从 meta 中提取前后余额变化
      const preBalances = transaction.meta.preBalances;
      const postBalances = transaction.meta.postBalances;
      
      // 简单计算（实际应该解析 token 余额变化）
      if (preBalances.length > 0 && postBalances.length > 0) {
        const diff = Math.abs(postBalances[0] - preBalances[0]) / 1e9;
        amount0In = diff;
        amount1Out = diff; // 简化处理
      }
      
      // 插入交易记录
      const txRecord = await insertTransaction({
        pool_id: pool.id,
        tx_hash: signature,
        block_number: slot,
        event_type: eventType,
        amount0_in: amount0In,
        amount1_in: amount1In,
        amount0_out: amount0Out,
        amount1_out: amount1Out,
        sender: transaction.transaction.message.accountKeys[0]?.toString() || 'unknown',
        recipient: null,
        usd_value: null,
        price: amount1Out > 0 ? amount0In / amount1Out : 0,
        timestamp: timestamp
      });
      
      if (txRecord) {
        console.log(`💱 Solana Swap: ${pool.token0_symbol}/${pool.token1_symbol} | TX: ${signature.substring(0, 10)}...`);
      }
    } catch (error) {
      console.error('解析 Raydium 日志失败:', error.message);
    }
  }

  // 监听账户变化
  async subscribeToAccountChanges(poolAddress) {
    try {
      const pool = this.poolData.get(poolAddress.toLowerCase());
      if (!pool) return;
      
      const { pubkey } = pool;
      
      // 订阅账户变化（储备量更新）
      const accountSubscriptionId = this.connection.onAccountChange(
        pubkey,
        async (accountInfo, context) => {
          console.log(`📊 ${poolAddress} 账户更新 at slot ${context.slot}`);
          
          // 解析并更新储备量
          // 实际需要根据池子数据结构解析
          try {
            // 这里简化处理
            const reserve0 = Math.random() * 1000; // TODO: 实际解析
            const reserve1 = Math.random() * 1000;
            
            await updatePoolReserves(poolAddress.toLowerCase(), reserve0, reserve1, null);
          } catch (error) {
            console.error('更新储备量失败:', error.message);
          }
        },
        'confirmed'
      );
      
      this.subscriptions.set(`account_${poolAddress}`, accountSubscriptionId);
      console.log(`✅ 订阅账户变化: ${poolAddress}`);
    } catch (error) {
      console.error(`订阅账户变化失败 ${poolAddress}:`, error.message);
    }
  }

  // 监听日志（交易）
  async subscribeToLogs(poolAddress) {
    try {
      const pool = this.poolData.get(poolAddress.toLowerCase());
      if (!pool) return;
      
      const { pubkey } = pool;
      
      // 订阅日志
      const logsSubscriptionId = this.connection.onLogs(
        pubkey,
        async (logs, context) => {
          if (logs.err) {
            console.error('交易失败:', logs.err);
            return;
          }
          
          console.log(`📝 ${poolAddress} 新交易 at slot ${context.slot}`);
          
          // 解析日志
          await this.parseRaydiumLogs(
            poolAddress,
            logs.logs,
            logs.signature,
            context.slot
          );
        },
        'confirmed'
      );
      
      this.subscriptions.set(`logs_${poolAddress}`, logsSubscriptionId);
      console.log(`✅ 订阅交易日志: ${poolAddress}`);
    } catch (error) {
      console.error(`订阅交易日志失败 ${poolAddress}:`, error.message);
    }
  }

  // 开始监控
  async start(poolAddresses) {
    if (this.isRunning) {
      console.log('⚠️  Solana 监控服务已在运行中');
      return;
    }
    
    try {
      // 初始化连接
      const connected = await this.initialize();
      if (!connected) {
        throw new Error('无法连接到 Solana 节点');
      }
      
      // 初始化所有池子
      for (const poolAddress of poolAddresses) {
        await this.initializePool(poolAddress);
      }
      
      // 开始监听
      console.log('\n👀 开始监听 Solana 事件...\n');
      
      for (const poolAddress of poolAddresses) {
        await this.subscribeToAccountChanges(poolAddress);
        await this.subscribeToLogs(poolAddress);
      }
      
      this.isRunning = true;
      await updateMonitorStatus('solana', true);
      
      console.log('✅ Solana 监控服务已启动\n');
    } catch (error) {
      console.error('❌ 启动 Solana 监控服务失败:', error);
      this.isRunning = false;
      await updateMonitorStatus('solana', false);
      throw error;
    }
  }

  // 停止监控
  async stop() {
    console.log('⏹️  停止 Solana 监控服务...');
    
    // 取消所有订阅
    for (const [key, subscriptionId] of this.subscriptions) {
      try {
        if (key.startsWith('account_')) {
          await this.connection.removeAccountChangeListener(subscriptionId);
        } else if (key.startsWith('logs_')) {
          await this.connection.removeOnLogsListener(subscriptionId);
        }
        console.log(`✅ 取消订阅: ${key}`);
      } catch (error) {
        console.error(`取消订阅失败 ${key}:`, error.message);
      }
    }
    
    this.subscriptions.clear();
    this.isRunning = false;
    await updateMonitorStatus('solana', false);
    
    console.log('✅ Solana 监控服务已停止');
  }
}

module.exports = SolanaMonitor;

