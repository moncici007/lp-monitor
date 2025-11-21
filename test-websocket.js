require('dotenv').config();
const { Web3 } = require('web3');

async function testWebSocket() {
  console.log('🔍 测试 WebSocket 连接...\n');
  
  const wssUrl = process.env.BSC_WSS_URL;
  
  if (!wssUrl) {
    console.error('❌ 未配置 BSC_WSS_URL');
    process.exit(1);
  }
  
  console.log('📋 WebSocket URL:', wssUrl);
  console.log('');
  
  try {
    console.log('🔌 正在连接...');
    
    const web3 = new Web3(new Web3.providers.WebsocketProvider(wssUrl, {
      reconnect: {
        auto: true,
        delay: 5000,
        maxAttempts: 5,
      },
      timeout: 30000
    }));
    
    // 测试连接
    const blockNumber = await web3.eth.getBlockNumber();
    console.log('✅ WebSocket 连接成功！');
    console.log('✅ 当前区块:', blockNumber);
    
    // 测试获取区块信息
    const block = await web3.eth.getBlock('latest');
    console.log('✅ 最新区块时间:', new Date(Number(block.timestamp) * 1000).toLocaleString('zh-CN'));
    
    // 测试合约调用
    const poolAddress = process.env.BSC_POOL_ADDRESSES?.split(',')[0]?.trim();
    if (poolAddress) {
      console.log('\n📊 测试池子:', poolAddress);
      
      const PAIR_ABI = [
        {
          "constant": true,
          "inputs": [],
          "name": "token0",
          "outputs": [{"name": "", "type": "address"}],
          "type": "function"
        }
      ];
      
      const contract = new web3.eth.Contract(PAIR_ABI, poolAddress);
      const token0 = await contract.methods.token0().call();
      console.log('✅ 池子查询成功，Token0:', token0);
      
      // 测试事件监听
      console.log('\n🎯 测试事件监听功能...');
      const swapEvent = contract.events.Swap;
      
      if (swapEvent) {
        console.log('✅ 事件监听功能可用！');
        console.log('💡 监控服务应该可以正常工作');
      } else {
        console.log('⚠️  事件监听功能不可用');
        console.log('💡 可能需要检查 Web3.js 版本');
      }
    }
    
    console.log('\n✅ 所有测试通过！');
    console.log('🚀 现在可以运行: npm run monitor');
    
    // 断开连接
    if (web3.currentProvider && web3.currentProvider.disconnect) {
      web3.currentProvider.disconnect();
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ WebSocket 连接失败:', error.message);
    console.log('\n💡 可能的原因:');
    console.log('  1. API Key 不正确或已过期');
    console.log('  2. 网络连接问题');
    console.log('  3. WebSocket 端口被防火墙阻止');
    console.log('  4. NodeReal 服务暂时不可用');
    console.log('\n💡 建议:');
    console.log('  1. 检查 NodeReal 控制台确认 API Key');
    console.log('  2. 尝试访问 https://nodereal.io/ 检查服务状态');
    console.log('  3. 尝试使用备用 WebSocket 节点');
    
    process.exit(1);
  }
}

testWebSocket();
