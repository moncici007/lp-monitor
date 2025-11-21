export default function RecentTransactions({ data, error }) {
  if (error) {
    return (
      <div className="card">
        <div className="error">加载交易记录失败: {error.message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const { transactions } = data;

  if (!transactions || transactions.length === 0) {
    return (
      <div className="card">
        <div className="empty">暂无交易记录</div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(4);
  };

  const getEventBadge = (eventType) => {
    const labels = {
      swap: '交换',
      mint: '添加',
      burn: '移除'
    };
    return (
      <span className={`badge ${eventType}`}>
        {labels[eventType] || eventType}
      </span>
    );
  };

  const getChainBadge = (chain) => {
    return <span className={`badge ${chain.toLowerCase()}`}>{chain.toUpperCase()}</span>;
  };

  const shortenHash = (hash) => {
    if (!hash) return '-';
    return hash.substring(0, 6) + '...' + hash.substring(hash.length - 4);
  };

  const getExplorerUrl = (chain, txHash) => {
    if (chain === 'bsc') {
      return `https://bscscan.com/tx/${txHash}`;
    } else if (chain === 'solana') {
      return `https://solscan.io/tx/${txHash}`;
    }
    return '#';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffSeconds = Math.floor((now - time) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}秒前`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}分钟前`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}小时前`;
    return `${Math.floor(diffSeconds / 86400)}天前`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          最近交易 ({transactions.length})
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>链</th>
              <th>类型</th>
              <th>交易对</th>
              <th>数量 In</th>
              <th>数量 Out</th>
              <th>价格</th>
              <th>价值 (USD)</th>
              <th>交易哈希</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td style={{ fontSize: '12px', color: '#71767b' }}>
                  {formatTimeAgo(tx.timestamp)}
                </td>
                <td>{getChainBadge(tx.chain)}</td>
                <td>{getEventBadge(tx.event_type)}</td>
                <td style={{ fontWeight: '600' }}>{tx.pair}</td>
                <td>
                  {tx.amount0_in > 0 && (
                    <div>{formatNumber(tx.amount0_in)}</div>
                  )}
                  {tx.amount1_in > 0 && (
                    <div style={{ color: '#71767b', fontSize: '12px' }}>
                      {formatNumber(tx.amount1_in)}
                    </div>
                  )}
                  {tx.amount0_in === 0 && tx.amount1_in === 0 && '-'}
                </td>
                <td>
                  {tx.amount0_out > 0 && (
                    <div>{formatNumber(tx.amount0_out)}</div>
                  )}
                  {tx.amount1_out > 0 && (
                    <div style={{ color: '#71767b', fontSize: '12px' }}>
                      {formatNumber(tx.amount1_out)}
                    </div>
                  )}
                  {tx.amount0_out === 0 && tx.amount1_out === 0 && '-'}
                </td>
                <td>
                  {tx.price > 0 ? tx.price.toFixed(6) : '-'}
                </td>
                <td>
                  {tx.usd_value > 0 ? (
                    <span style={{ 
                      color: tx.usd_value > 10000 ? '#f4212e' : '#00ba7c',
                      fontWeight: tx.usd_value > 10000 ? '700' : 'normal'
                    }}>
                      ${formatNumber(tx.usd_value)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <a 
                    href={getExplorerUrl(tx.chain, tx.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#1d9bf0',
                      fontFamily: 'monospace',
                      fontSize: '12px'
                    }}
                  >
                    {shortenHash(tx.tx_hash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total > data.limit && (
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          color: '#71767b',
          fontSize: '14px'
        }}>
          显示 {data.count} / {data.total} 条交易
        </div>
      )}
    </div>
  );
}

