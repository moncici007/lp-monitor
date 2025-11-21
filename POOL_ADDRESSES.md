# 常用流动性池地址参考

## BSC (Binance Smart Chain) - PancakeSwap V2

### 主要交易对

#### 稳定币对
```
BUSD/USDT
地址: 0x7EFaEf62fDdCCa950418312c6C91Aef321375A00
流动性: 极高
适合: 稳定币套利监控
```

#### BNB 相关
```
WBNB/BUSD
地址: 0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
流动性: 极高
适合: 主要监控池，交易频繁
```

```
WBNB/USDT
地址: 0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE
流动性: 极高
适合: 主要监控池
```

#### CAKE (PancakeSwap 治理代币)
```
CAKE/WBNB
地址: 0x0eD7e52944161450477ee417DE9Cd3a859b14fD0
流动性: 高
适合: DEX 代币监控
```

```
CAKE/BUSD
地址: 0x804678fa97d91B974ec2af3c843270886528a9E6
流动性: 高
```

#### 热门代币
```
ETH/WBNB
地址: 0x74E4716E431f45807DCF19f284c7aA99F18a4fbc
流动性: 高
适合: 跨链资产监控
```

```
BTC/WBNB
地址: 0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082
流动性: 高
```

### 如何获取更多池子地址

1. **通过 PancakeSwap 官网**
   - 访问: https://pancakeswap.finance/swap
   - 选择交易对
   - 在浏览器开发者工具 Network 标签查看 API 请求
   - 找到 `pairAddress` 字段

2. **通过 BscScan**
   - 访问: https://bscscan.com/
   - 搜索代币合约
   - 查看 "Contract" 标签
   - 找到 Pair 地址

3. **通过 PancakeSwap Info**
   - 访问: https://pancakeswap.finance/info/pairs
   - 查看池子列表
   - 点击池子查看详情
   - URL 中包含池子地址

---

## Solana - Raydium

### 主要交易对

#### SOL 相关
```
SOL/USDC
地址: 58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
流动性: 极高
适合: 主要监控池
```

```
SOL/USDT
地址: 7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX
流动性: 高
```

#### RAY (Raydium 治理代币)
```
RAY/USDC
地址: 6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg
流动性: 高
适合: DEX 代币监控
```

```
RAY/SOL
地址: AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA
流动性: 高
```

#### 热门代币
```
mSOL/SOL (Marinade Staked SOL)
地址: 5ijRoAHVgd5T5CNtK5KDRUBZ7Bffb69nktMj5n6ks6m4
流动性: 高
适合: 质押代币监控
```

```
BONK/SOL
地址: 8kgKkC5sF1hj9wLqg3zjpVJPCUFLPvLTqNqrYyXrr7gG
流动性: 中
适合: Meme 币监控
```

### 如何获取更多池子地址

1. **通过 Raydium 官网**
   - 访问: https://raydium.io/liquidity/
   - 选择交易对
   - 点击 "View Pool" 查看详情
   - 复制 Pool ID

2. **通过 Solscan**
   - 访问: https://solscan.io/
   - 搜索代币地址
   - 查看 "Token Accounts"
   - 找到 Raydium 相关账户

3. **通过 Raydium API**
   ```bash
   curl https://api.raydium.io/v2/main/pairs
   ```

---

## Solana - Orca

### 主要交易对

```
SOL/USDC (Whirlpool)
地址: HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
流动性: 高
特点: 集中流动性池
```

```
ORCA/USDC
地址: 2p7nYbtPBgtmY69NsE8DAW6szpRJn7tQvDnqvoEWQvjY
流动性: 中
```

### 如何获取 Orca 池子地址

1. 访问: https://www.orca.so/
2. 选择交易对
3. 查看 Pool Details
4. 复制 Pool Address

---

## 配置示例

### 单个池子监控
```bash
# .env
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
```

### 多个池子监控（推荐）
```bash
# .env
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16,0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE,0x0eD7e52944161450477ee417DE9Cd3a859b14fD0

SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2,6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg
```

### 按流动性级别选择

**高流动性池子** (推荐新手):
- 交易频繁，数据丰富
- 适合测试和学习
- 示例: WBNB/BUSD, SOL/USDC

**中等流动性池子**:
- 交易适中
- 适合特定代币监控
- 示例: CAKE/WBNB, RAY/USDC

**低流动性池子**:
- 交易较少
- 适合小币种监控
- 可能需要更长时间才能看到交易

---

## 注意事项

1. **流动性考虑**
   - 高流动性池子交易更频繁
   - 更容易触发大额交易预警
   - 数据更有参考价值

2. **Gas 费用**
   - BSC Gas 费用较低（约 $0.1-0.5）
   - Solana 交易费用极低（约 $0.00025）

3. **RPC 限制**
   - 免费 RPC 可能有请求限制
   - 监控多个池子建议使用付费 RPC
   - 推荐同时监控 2-5 个池子

4. **数据量**
   - 每个池子每天可能产生数千笔交易
   - 注意数据库存储空间
   - 定期清理旧数据（可选）

5. **实时性**
   - WebSocket 连接提供最佳实时性
   - HTTP 轮询会有延迟
   - 网络状况影响监控效果

---

## 推荐配置方案

### 方案 1: 新手入门
监控 1-2 个高流动性池子，快速看到效果

```bash
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16
SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
```

### 方案 2: 全面监控
监控多个主要交易对，获得完整市场视图

```bash
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16,0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE,0x0eD7e52944161450477ee417DE9Cd3a859b14fD0,0x7EFaEf62fDdCCa950418312c6C91Aef321375A00

SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2,6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg
```

### 方案 3: 专注某个链
只监控一个链，降低资源消耗

```bash
# 只监控 BSC
BSC_POOL_ADDRESSES=0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16,0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE

# 或只监控 Solana
SOLANA_POOL_ADDRESSES=58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2,6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg
```

---

## 验证池子地址

在添加新池子前，建议验证：

1. **在区块浏览器中查看**
   - BscScan (BSC): https://bscscan.com/
   - Solscan (Solana): https://solscan.io/

2. **检查流动性**
   - 确保池子有足够的流动性
   - 避免废弃或低流动性池子

3. **确认 DEX**
   - PancakeSwap V2 (BSC)
   - Raydium V4 或 Orca (Solana)

4. **测试单个池子**
   - 先测试一个池子
   - 确认能正常监控后再添加更多

---

最后更新: 2024-11-20

