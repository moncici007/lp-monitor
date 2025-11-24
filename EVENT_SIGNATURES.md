# 🔑 PancakeSwap V2 & V3 事件签名对照表

## 📋 完整签名列表

### PancakeSwap V2 事件签名

| 事件名称 | 签名 |
|---------|------|
| **Swap** | `0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822` |
| **Mint** | `0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f` |
| **Burn** | `0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496` |
| **Sync** | `0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1` |

### PancakeSwap V3 事件签名

| 事件名称 | 签名 |
|---------|------|
| **Swap** | `0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83` |
| **Mint** | `0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde` |
| **Burn** | `0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c` |

---

## 🔍 事件结构对比

### Swap 事件

#### V2 Swap
```solidity
event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In,
    uint amount0Out,
    uint amount1Out,
    address indexed to
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0xd78ad95f...`
- `topics[1]`: sender 地址
- `topics[2]`: to 地址
- `data`: [amount0In, amount1In, amount0Out, amount1Out] (4个 uint256)

#### V3 Swap
```solidity
event Swap(
    address indexed sender,
    address indexed recipient,
    int256 amount0,
    int256 amount1,
    uint160 sqrtPriceX96,
    uint128 liquidity,
    int24 tick
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0x19b47279...`
- `topics[1]`: sender 地址
- `topics[2]`: recipient 地址
- `data`: [amount0, amount1, sqrtPriceX96, liquidity, tick]
  - amount0/amount1: int256 (负数=流出, 正数=流入)
  - sqrtPriceX96: uint160
  - liquidity: uint128
  - tick: int24

---

### Mint 事件

#### V2 Mint
```solidity
event Mint(
    address indexed sender,
    uint amount0,
    uint amount1
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0x4c209b5f...`
- `topics[1]`: sender 地址
- `data`: [amount0, amount1] (2个 uint256)

#### V3 Mint
```solidity
event Mint(
    address sender,
    address indexed owner,
    int24 indexed tickLower,
    int24 indexed tickUpper,
    uint128 amount,
    uint256 amount0,
    uint256 amount1
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0x7a53080b...`
- `topics[1]`: owner 地址
- `topics[2]`: tickLower
- `topics[3]`: tickUpper
- `data`: [sender, amount, amount0, amount1]

---

### Burn 事件

#### V2 Burn
```solidity
event Burn(
    address indexed sender,
    uint amount0,
    uint amount1,
    address indexed to
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0xdccd412f...`
- `topics[1]`: sender 地址
- `topics[2]`: to 地址
- `data`: [amount0, amount1] (2个 uint256)

#### V3 Burn
```solidity
event Burn(
    address indexed owner,
    int24 indexed tickLower,
    int24 indexed tickUpper,
    uint128 amount,
    uint256 amount0,
    uint256 amount1
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0x0c396cd9...`
- `topics[1]`: owner 地址
- `topics[2]`: tickLower
- `topics[3]`: tickUpper
- `data`: [amount, amount0, amount1]

---

### Sync 事件 (仅 V2)

```solidity
event Sync(
    uint112 reserve0,
    uint112 reserve1
);
```

**数据结构**:
- `topics[0]`: 事件签名 `0x1c411e9a...`
- `data`: [reserve0, reserve1] (2个 uint112)

**注意**: V3 没有 Sync 事件

---

## 💻 代码示例

### JavaScript 识别版本

```javascript
const EVENT_SIGNATURES = {
  // V2
  V2_SWAP: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  V2_MINT: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  V2_BURN: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
  V2_SYNC: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
  
  // V3
  V3_SWAP: '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
  V3_MINT: '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde',
  V3_BURN: '0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c',
};

function identifyEvent(signature) {
  switch(signature) {
    case EVENT_SIGNATURES.V2_SWAP:
      return { type: 'swap', version: 'V2' };
    case EVENT_SIGNATURES.V3_SWAP:
      return { type: 'swap', version: 'V3' };
    case EVENT_SIGNATURES.V2_MINT:
      return { type: 'mint', version: 'V2' };
    case EVENT_SIGNATURES.V3_MINT:
      return { type: 'mint', version: 'V3' };
    case EVENT_SIGNATURES.V2_BURN:
      return { type: 'burn', version: 'V2' };
    case EVENT_SIGNATURES.V3_BURN:
      return { type: 'burn', version: 'V3' };
    case EVENT_SIGNATURES.V2_SYNC:
      return { type: 'sync', version: 'V2' };
    default:
      return null;
  }
}
```

### 解析 V2 Swap

```javascript
const { ethers } = require('ethers');

function parseV2Swap(log) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const decodedData = abiCoder.decode(
    ['uint256', 'uint256', 'uint256', 'uint256'],
    log.data
  );

  return {
    sender: '0x' + log.topics[1].slice(26),
    to: '0x' + log.topics[2].slice(26),
    amount0In: decodedData[0].toString(),
    amount1In: decodedData[1].toString(),
    amount0Out: decodedData[2].toString(),
    amount1Out: decodedData[3].toString(),
  };
}
```

### 解析 V3 Swap

```javascript
function parseV3Swap(log) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const decodedData = abiCoder.decode(
    ['int256', 'int256', 'uint160', 'uint128', 'int24'],
    log.data
  );

  const amount0 = decodedData[0];
  const amount1 = decodedData[1];

  return {
    sender: '0x' + log.topics[1].slice(26),
    recipient: '0x' + log.topics[2].slice(26),
    amount0In: amount0 < 0n ? (-amount0).toString() : '0',
    amount0Out: amount0 > 0n ? amount0.toString() : '0',
    amount1In: amount1 < 0n ? (-amount1).toString() : '0',
    amount1Out: amount1 > 0n ? amount1.toString() : '0',
    sqrtPriceX96: decodedData[2].toString(),
    liquidity: decodedData[3].toString(),
    tick: decodedData[4].toString(),
  };
}
```

---

## 🔧 在本项目中的使用

### 配置文件位置

所有事件签名都在以下文件中配置：

1. **后端处理器**:
   - `src/monitor/streams/eventProcessor.js` - 事件解析和处理
   - `src/monitor/streams/streamManager.js` - Stream 配置

2. **QuickNode 过滤器**:
   - `quicknode-stream-filter.js` - V2 过滤器
   - `quicknode-stream-filter-v3.js` - V3 过滤器
   - `quicknode-stream-filter-v2-and-v3.js` - 统一过滤器

3. **测试脚本**:
   - `test-webhook-data.js` - Webhook 数据测试

---

## ⚠️ 重要提示

### 签名计算方式

事件签名是通过 Keccak-256 哈希计算得出的：

```javascript
// V2 Swap 签名计算
const signature = ethers.keccak256(
  ethers.toUtf8Bytes('Swap(address,uint256,uint256,uint256,uint256,address)')
);
// 结果: 0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822

// V3 Swap 签名计算
const signature = ethers.keccak256(
  ethers.toUtf8Bytes('Swap(address,address,int256,int256,uint160,uint128,int24)')
);
// 结果: 0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83
```

### 常见错误

❌ **错误的签名会导致事件无法识别**
- 确保签名完整（包括 `0x` 前缀）
- 签名必须是小写
- 签名长度为 66 个字符（0x + 64 个十六进制字符）

✅ **正确配置**
- 使用本文档提供的完整签名
- V2 和 V3 签名不要混淆
- 系统会自动根据签名识别版本

---

## 📚 参考资料

- [PancakeSwap V2 合约](https://bscscan.com/address/0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73)
- [PancakeSwap V3 文档](https://docs.pancakeswap.finance/products/pancakeswap-exchange/v3)
- [Ethereum Event Signatures](https://www.4byte.directory/)
- [ethers.js Documentation](https://docs.ethers.org/)

---

**最后更新**: 2024年11月24日

