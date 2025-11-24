// 格式化地址（显示前6位和后4位）
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// 格式化数字（添加千分位）
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return parseFloat(num).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

// 格式化大数字（K, M, B）
export function formatLargeNumber(num) {
  if (num === null || num === undefined) return '0';
  const value = parseFloat(num);

  if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  }
  return value.toFixed(2);
}

// 格式化USD金额
export function formatUSD(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${formatLargeNumber(amount)}`;
}

// 格式化时间（相对时间）
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return `${seconds}秒前`;
}

// 格式化完整时间
export function formatFullTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
}

// 格式化代币数量
export function formatTokenAmount(amount, decimals = 18) {
  if (!amount) return '0';
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const result = Number(value) / Number(divisor);
    return formatNumber(result);
  } catch (error) {
    return '0';
  }
}

// 复制到剪贴板
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

// 获取BSCScan链接
export function getBscScanLink(address, type = 'address') {
  const baseUrl = 'https://bscscan.com';
  return `${baseUrl}/${type}/${address}`;
}

