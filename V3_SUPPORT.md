# PancakeSwap V3 支持说明

## ⚠️ 重要：V2 和 V3 的区别

### 事件签名对比

| 事件 | PancakeSwap V2 | PancakeSwap V3 |
|------|----------------|----------------|
| **Swap** | `0xc42079...` | `0xd78ad9...` |
| **Mint** | `0x4c209b...` | `0x7a5308...` |
| **Burn** | `0xdccd41...` | `0x0c396c...` |

### 事件结构差异

#### V2 Swap 事件
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

#### V3 Swap 事件
```solidity
event Swap(
    address indexed sender,
    address indexed recipient,
    int256 amount0,        // 注意：int256，可以是负数！
    int256 amount1,        // 注意：int256，可以是负数！
    uint160 sqrtPriceX96,  // 新增：价格
    uint128 liquidity,     // 新增：流动性
    int24 tick             // 新增：tick
);
```

## 🔍 如何判断您使用的是 V2 还是 V3？

### 方法1：通过事件签名

查看 Webhook 返回的数据中的 `topics[0]`：

```javascript
// V2 Swap
"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"

// V3 Swap
"0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"
```

### 方法2：通过合约地址

**PancakeSwap V2 Factory**:
```
0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
```

**PancakeSwap V3 Factory**:
```
0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865
```

### 方法3：在 BSCScan 查看

访问 https://bscscan.com/address/您的交易对地址

查看 "Contract" 标签，会显示合约类型。

## 📋 根据您的数据判断

从您提供的数据：
```json
{
  "topics": [
    "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    ...
  ]
}
```

**您正在监控 PancakeSwap V3！**

## 🔧 解决方案

### 选项1：继续使用 V3（推荐）

使用我提供的 `quicknode-stream-filter-v3.js` 过滤器。

**注意事项：**
1. V3 的数据解析更复杂（int256、sqrtPriceX96 等）
2. 需要修改事件处理器来支持 V3 格式
3. V3 有集中流动性的概念，分析逻辑不同

### 选项2：切换到 V2

如果您想监控 V2 的交易对：

1. 找到 PancakeSwap V2 的交易对地址
2. 使用 `quicknode-stream-filter.js`（V2 版本）
3. 确保事件签名使用 V2 的

## 🛠️ V3 事件处理器实现

由于 V3 的事件结构不同，需要创建专门的处理器：

### V3 Swap 事件解析

```javascript
function parseV3SwapData(topics, data) {
  // topics[1] = sender (indexed)
  // topics[2] = recipient (indexed)
  // data 包含: amount0, amount1, sqrtPriceX96, liquidity, tick
  
  const sender = "0x" + topics[1].slice(26);
  const recipient = "0x" + topics[2].slice(26);
  
  // 解析 data（每个字段32字节，但类型不同）
  const cleanData = data.slice(2);
  
  // int256 需要特殊处理（可能是负数）
  const amount0 = parseSignedInt256("0x" + cleanData.slice(0, 64));
  const amount1 = parseSignedInt256("0x" + cleanData.slice(64, 128));
  const sqrtPriceX96 = BigInt("0x" + cleanData.slice(128, 192));
  const liquidity = BigInt("0x" + cleanData.slice(192, 256));
  const tick = parseSignedInt24("0x" + cleanData.slice(256, 320));
  
  return {
    sender,
    recipient,
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    sqrtPriceX96: sqrtPriceX96.toString(),
    liquidity: liquidity.toString(),
    tick: tick
  };
}

// 解析有符号 int256
function parseSignedInt256(hex) {
  const value = BigInt(hex);
  const maxValue = BigInt(2) ** BigInt(255);
  
  if (value >= maxValue) {
    // 负数（二进制补码）
    return value - (BigInt(2) ** BigInt(256));
  }
  return value;
}

// 解析有符号 int24
function parseSignedInt24(hex) {
  let value = parseInt(hex, 16);
  const maxValue = Math.pow(2, 23);
  
  if (value >= maxValue) {
    value = value - Math.pow(2, 24);
  }
  return value;
}
```

## 📊 V3 数据分析差异

### V2 分析逻辑
```javascript
// V2: 简单的 xy=k 模型
const price = reserve1 / reserve0;
```

### V3 分析逻辑
```javascript
// V3: 集中流动性模型
// 价格从 sqrtPriceX96 计算
const price = (sqrtPriceX96 / (2 ** 96)) ** 2;

// V3 有 tick 范围的概念
// 流动性可能集中在特定价格区间
```

## 🎯 推荐方案

### 如果您想监控 V2（简单）

1. 找到 PancakeSwap V2 的交易对
2. 使用提供的 V2 过滤器
3. 现有代码无需太多修改

### 如果您想监控 V3（复杂但先进）

1. 使用 `quicknode-stream-filter-v3.js`
2. 需要实现 V3 特定的事件解析
3. 需要理解集中流动性的概念
4. 数据分析逻辑更复杂

## 📚 参考资源

- [Uniswap V3 白皮书](https://uniswap.org/whitepaper-v3.pdf)
- [PancakeSwap V3 文档](https://docs.pancakeswap.finance/products/pancakeswap-v3)
- [BSCScan V2 Factory](https://bscscan.com/address/0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73)
- [BSCScan V3 Factory](https://bscscan.com/address/0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865)

## ❓ 如何选择

**选择 V2 如果：**
- ✅ 您想要简单的实现
- ✅ 足够的流动性在 V2
- ✅ 不需要复杂的价格分析

**选择 V3 如果：**
- ✅ 大部分流动性在 V3
- ✅ 需要更精确的价格信息
- ✅ 愿意处理更复杂的数据结构
- ✅ 想要监控集中流动性变化

---

**需要帮助？** 请根据您的需求告诉我，我可以帮您配置相应的版本。

