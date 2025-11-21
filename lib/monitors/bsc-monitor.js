const { Web3 } = require('web3');
const { HttpsProxyAgent } = require('https-proxy-agent');
const {
  getOrCreatePool,
  insertTransaction,
  updatePoolReserves,
  upsertHourlyStats,
  createAlert,
  updateMonitorStatus
} = require('../db');

// PancakeSwap V2 Pair ABI (只包含我们需要的事件和函数)
const PAIR_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sender", "type": "address"},
      {"indexed": false, "name": "amount0", "type": "uint256"},
      {"indexed": false, "name": "amount1", "type": "uint256"}
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sender", "type": "address"},
      {"indexed": false, "name": "amount0", "type": "uint256"},
      {"indexed": false, "name": "amount1", "type": "uint256"},
      {"indexed": true, "name": "to", "type": "address"}
    ],
    "name": "Burn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sender", "type": "address"},
      {"indexed": false, "name": "amount0In", "type": "uint256"},
      {"indexed": false, "name": "amount1In", "type": "uint256"},
      {"indexed": false, "name": "amount0Out", "type": "uint256"},
      {"indexed": false, "name": "amount1Out", "type": "uint256"},
      {"indexed": true, "name": "to", "type": "address"}
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "reserve0", "type": "uint112"},
      {"indexed": false, "name": "reserve1", "type": "uint112"}
    ],
    "name": "Sync",
    "type": "event"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {"name": "reserve0", "type": "uint112"},
      {"name": "reserve1", "type": "uint112"},
      {"name": "blockTimestampLast", "type": "uint32"}
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "token0",
    "outputs": [{"name": "", "type": "address"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "token1",
    "outputs": [{"name": "", "type": "address"}],
    "type": "function"
  }
];

// ERC20 ABI (用于获取代币信息)
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  }
];

class BSCMonitor {
  constructor() {
    this.web3 = null;
    this.contracts = new Map();
    this.poolData = new Map();
    this.isRunning = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  // 初始化 Web3 连接
  async initialize() {
    console.log('🔗 初始化 BSC 监控服务...');
    
    try {
      // 优先使用 WebSocket，如果失败则使用 HTTP
      const rpcUrl = process.env.BSC_WSS_URL || process.env.BSC_RPC_URL;
      
      // 配置代理
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      
      if (rpcUrl.startsWith('wss://') || rpcUrl.startsWith('ws://')) {
        const wsOptions = {
          reconnect: {
            auto: true,
            delay: 5000,
            maxAttempts: 10,
            onTimeout: false
          }
        };
        
        // 如果有代理，添加代理配置
        if (proxyUrl) {
          wsOptions.agent = new HttpsProxyAgent(proxyUrl);
          console.log(`🌐 使用代理: ${proxyUrl}`);
        }
        
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(rpcUrl, wsOptions));
        console.log('✅ 使用 WebSocket 连接');
      } else {
        const httpOptions = {};
        
        // 如果有代理，添加代理配置
        if (proxyUrl) {
          httpOptions.agent = new HttpsProxyAgent(proxyUrl);
          console.log(`🌐 使用代理: ${proxyUrl}`);
        }
        
        this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl, httpOptions));
        console.log('✅ 使用 HTTP 连接');
      }
      
      // 测试连接
      const blockNumber = await this.web3.eth.getBlockNumber();
      console.log(`✅ 连接成功！当前区块: ${blockNumber}`);
      
      return true;
    } catch (error) {
      console.error('❌ BSC 连接失败:', error.message);
      return false;
    }
  }

  // 获取代币信息
  async getTokenInfo(tokenAddress) {
    try {
      const tokenContract = new this.web3.eth.Contract(ERC20_ABI, tokenAddress);
      const [symbol, decimals] = await Promise.all([
        tokenContract.methods.symbol().call(),
        tokenContract.methods.decimals().call()
      ]);
      return { symbol, decimals: parseInt(decimals) };
    } catch (error) {
      console.error(`获取代币信息失败 ${tokenAddress}:`, error.message);
      return { symbol: 'UNKNOWN', decimals: 18 };
    }
  }

  // 初始化池子数据
  async initializePool(poolAddress) {
    console.log(`\n📊 初始化池子: ${poolAddress}`);
    
    try {
      const contract = new this.web3.eth.Contract(PAIR_ABI, poolAddress);
      
      // 获取池子基本信息
      const [token0Address, token1Address, reserves] = await Promise.all([
        contract.methods.token0().call(),
        contract.methods.token1().call(),
        contract.methods.getReserves().call()
      ]);
      
      // 获取代币信息
      const [token0Info, token1Info] = await Promise.all([
        this.getTokenInfo(token0Address),
        this.getTokenInfo(token1Address)
      ]);
      
      // 存储到数据库
      const poolData = {
        chain: 'bsc',
        dex: 'pancakeswap',
        pool_address: poolAddress.toLowerCase(),
        token0_address: token0Address.toLowerCase(),
        token0_symbol: token0Info.symbol,
        token0_decimals: token0Info.decimals,
        token1_address: token1Address.toLowerCase(),
        token1_symbol: token1Info.symbol,
        token1_decimals: token1Info.decimals
      };
      
      const pool = await getOrCreatePool(poolData);
      
      // 更新储备量
      const reserve0 = this.web3.utils.fromWei(reserves.reserve0.toString(), 'ether');
      const reserve1 = this.web3.utils.fromWei(reserves.reserve1.toString(), 'ether');
      await updatePoolReserves(poolAddress.toLowerCase(), reserve0, reserve1, null);
      
      // 缓存池子数据
      this.poolData.set(poolAddress.toLowerCase(), {
        ...pool,
        contract
      });
      
      console.log(`✅ 池子初始化完成: ${token0Info.symbol}/${token1Info.symbol}`);
      
      return pool;
    } catch (error) {
      console.error(`❌ 池子初始化失败 ${poolAddress}:`, error.message);
      throw error;
    }
  }

  // 处理 Swap 事件
  async handleSwapEvent(poolAddress, event) {
    try {
      const pool = this.poolData.get(poolAddress.toLowerCase());
      if (!pool) return;
      
      const { returnValues, transactionHash, blockNumber } = event;
      
      // 获取区块时间
      const block = await this.web3.eth.getBlock(blockNumber);
      const timestamp = new Date(Number(block.timestamp) * 1000);
      
      // 转换金额
      const amount0In = this.web3.utils.fromWei(returnValues.amount0In, 'ether');
      const amount1In = this.web3.utils.fromWei(returnValues.amount1In, 'ether');
      const amount0Out = this.web3.utils.fromWei(returnValues.amount0Out, 'ether');
      const amount1Out = this.web3.utils.fromWei(returnValues.amount1Out, 'ether');
      
      // 计算价格
      let price = 0;
      if (parseFloat(amount0In) > 0 && parseFloat(amount1Out) > 0) {
        price = parseFloat(amount1Out) / parseFloat(amount0In);
      } else if (parseFloat(amount1In) > 0 && parseFloat(amount0Out) > 0) {
        price = parseFloat(amount0Out) / parseFloat(amount1In);
      }
      
      // 这里简化处理，实际应该通过价格预言机获取 USD 价值
      const usdValue = null; // TODO: 集成价格预言机
      
      // 插入交易记录
      const transaction = await insertTransaction({
        pool_id: pool.id,
        tx_hash: transactionHash,
        block_number: blockNumber,
        event_type: 'swap',
        amount0_in: amount0In,
        amount1_in: amount1In,
        amount0_out: amount0Out,
        amount1_out: amount1Out,
        sender: returnValues.sender,
        recipient: returnValues.to,
        usd_value: usdValue,
        price: price,
        timestamp: timestamp
      });
      
      if (transaction) {
        console.log(`💱 Swap: ${pool.token0_symbol}/${pool.token1_symbol} | Price: ${price.toFixed(6)} | TX: ${transactionHash.substring(0, 10)}...`);
        
        // 更新小时统计
        await this.updateHourlyStats(pool, transaction, price);
        
        // 检查是否需要创建预警
        if (usdValue && usdValue > parseFloat(process.env.LARGE_TRADE_THRESHOLD_USD || 10000)) {
          await createAlert({
            transaction_id: transaction.id,
            pool_id: pool.id,
            alert_type: 'large_swap',
            usd_value: usdValue,
            threshold_usd: process.env.LARGE_TRADE_THRESHOLD_USD
          });
          console.log(`🚨 大额交易预警: $${usdValue.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error('处理 Swap 事件失败:', error.message);
    }
  }

  // 处理 Mint 事件（添加流动性）
  async handleMintEvent(poolAddress, event) {
    try {
      const pool = this.poolData.get(poolAddress.toLowerCase());
      if (!pool) return;
      
      const { returnValues, transactionHash, blockNumber } = event;
      const block = await this.web3.eth.getBlock(blockNumber);
      const timestamp = new Date(Number(block.timestamp) * 1000);
      
      const amount0 = this.web3.utils.fromWei(returnValues.amount0, 'ether');
      const amount1 = this.web3.utils.fromWei(returnValues.amount1, 'ether');
      
      await insertTransaction({
        pool_id: pool.id,
        tx_hash: transactionHash,
        block_number: blockNumber,
        event_type: 'mint',
        amount0_in: amount0,
        amount1_in: amount1,
        amount0_out: 0,
        amount1_out: 0,
        sender: returnValues.sender,
        recipient: null,
        usd_value: null,
        price: null,
        timestamp: timestamp
      });
      
      console.log(`➕ Add Liquidity: ${pool.token0_symbol}/${pool.token1_symbol} | TX: ${transactionHash.substring(0, 10)}...`);
    } catch (error) {
      console.error('处理 Mint 事件失败:', error.message);
    }
  }

  // 处理 Burn 事件（移除流动性）
  async handleBurnEvent(poolAddress, event) {
    try {
      const pool = this.poolData.get(poolAddress.toLowerCase());
      if (!pool) return;
      
      const { returnValues, transactionHash, blockNumber } = event;
      const block = await this.web3.eth.getBlock(blockNumber);
      const timestamp = new Date(Number(block.timestamp) * 1000);
      
      const amount0 = this.web3.utils.fromWei(returnValues.amount0, 'ether');
      const amount1 = this.web3.utils.fromWei(returnValues.amount1, 'ether');
      
      await insertTransaction({
        pool_id: pool.id,
        tx_hash: transactionHash,
        block_number: blockNumber,
        event_type: 'burn',
        amount0_in: 0,
        amount1_in: 0,
        amount0_out: amount0,
        amount1_out: amount1,
        sender: returnValues.sender,
        recipient: returnValues.to,
        usd_value: null,
        price: null,
        timestamp: timestamp
      });
      
      console.log(`➖ Remove Liquidity: ${pool.token0_symbol}/${pool.token1_symbol} | TX: ${transactionHash.substring(0, 10)}...`);
    } catch (error) {
      console.error('处理 Burn 事件失败:', error.message);
    }
  }

  // 处理 Sync 事件（储备量更新）
  async handleSyncEvent(poolAddress, event) {
    try {
      const { returnValues } = event;
      const reserve0 = this.web3.utils.fromWei(returnValues.reserve0, 'ether');
      const reserve1 = this.web3.utils.fromWei(returnValues.reserve1, 'ether');
      
      await updatePoolReserves(poolAddress.toLowerCase(), reserve0, reserve1, null);
    } catch (error) {
      console.error('处理 Sync 事件失败:', error.message);
    }
  }

  // 更新小时统计
  async updateHourlyStats(pool, transaction, price) {
    try {
      const hourTimestamp = new Date(transaction.timestamp);
      hourTimestamp.setMinutes(0, 0, 0);
      
      const volumeToken0 = parseFloat(transaction.amount0_in || 0) + parseFloat(transaction.amount0_out || 0);
      const volumeToken1 = parseFloat(transaction.amount1_in || 0) + parseFloat(transaction.amount1_out || 0);
      
      await upsertHourlyStats({
        pool_id: pool.id,
        hour_timestamp: hourTimestamp,
        volume_token0: volumeToken0,
        volume_token1: volumeToken1,
        volume_usd: transaction.usd_value || 0,
        tx_count: 1,
        swap_count: transaction.event_type === 'swap' ? 1 : 0,
        add_liquidity_count: transaction.event_type === 'mint' ? 1 : 0,
        remove_liquidity_count: transaction.event_type === 'burn' ? 1 : 0,
        price_open: price,
        price_close: price,
        price_high: price,
        price_low: price,
        liquidity_start: pool.liquidity,
        liquidity_end: pool.liquidity
      });
    } catch (error) {
      console.error('更新小时统计失败:', error.message);
    }
  }

  // 开始监控
  async start(poolAddresses) {
    if (this.isRunning) {
      console.log('⚠️  监控服务已在运行中');
      return;
    }
    
    try {
      // 初始化连接
      const connected = await this.initialize();
      if (!connected) {
        throw new Error('无法连接到 BSC 节点');
      }
      
      // 初始化所有池子
      for (const poolAddress of poolAddresses) {
        await this.initializePool(poolAddress);
      }
      
      // 开始监听事件
      console.log('\n👀 开始监听事件...\n');
      
      for (const [poolAddress, poolData] of this.poolData) {
        const { contract } = poolData;
        
        if (!contract) {
          console.error(`❌ 池子 ${poolAddress} 的合约实例不存在`);
          continue;
        }
        
        if (!contract.events) {
          console.error(`❌ 合约不支持事件监听（可能需要使用 WebSocket 而不是 HTTP）`);
          console.log('💡 提示: 使用 HTTP Provider 时，事件监听功能受限');
          console.log('💡 建议: 切换到 WebSocket RPC 或使用轮询方式');
          continue;
        }
        
        try {
          // 监听 Swap 事件
          const swapEvent = contract.events.Swap();
          if (swapEvent) {
            swapEvent
              .on('data', (event) => this.handleSwapEvent(poolAddress, event))
              .on('error', (error) => console.error('Swap 事件错误:', error.message));
          }
          
          // 监听 Mint 事件
          const mintEvent = contract.events.Mint();
          if (mintEvent) {
            mintEvent
              .on('data', (event) => this.handleMintEvent(poolAddress, event))
              .on('error', (error) => console.error('Mint 事件错误:', error.message));
          }
          
          // 监听 Burn 事件
          const burnEvent = contract.events.Burn();
          if (burnEvent) {
            burnEvent
              .on('data', (event) => this.handleBurnEvent(poolAddress, event))
              .on('error', (error) => console.error('Burn 事件错误:', error.message));
          }
          
          // 监听 Sync 事件
          const syncEvent = contract.events.Sync();
          if (syncEvent) {
            syncEvent
              .on('data', (event) => this.handleSyncEvent(poolAddress, event))
              .on('error', (error) => console.error('Sync 事件错误:', error.message));
          }
          
          console.log(`✅ 已注册事件监听: ${poolData.token0_symbol}/${poolData.token1_symbol}`);
        } catch (error) {
          console.error(`❌ 注册事件监听失败: ${error.message}`);
        }
      }
      
      this.isRunning = true;
      await updateMonitorStatus('bsc', true);
      
      console.log('✅ BSC 监控服务已启动\n');
    } catch (error) {
      console.error('❌ 启动 BSC 监控服务失败:', error);
      this.isRunning = false;
      await updateMonitorStatus('bsc', false);
      throw error;
    }
  }

  // 停止监控
  async stop() {
    console.log('⏹️  停止 BSC 监控服务...');
    this.isRunning = false;
    await updateMonitorStatus('bsc', false);
    
    if (this.web3 && this.web3.currentProvider) {
      if (this.web3.currentProvider.disconnect) {
        this.web3.currentProvider.disconnect();
      }
    }
    
    console.log('✅ BSC 监控服务已停止');
  }
}

module.exports = BSCMonitor;

