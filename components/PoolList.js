export default function PoolList({ data, error, selectedChain }) {
  if (error) {
    return (
      <div className="card">
        <div className="error">加载池子列表失败: {error.message}</div>
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

  const { pools } = data;

  if (!pools || pools.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          暂无池子数据
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            请在 .env 文件中配置要监控的池子地址
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const getChainBadge = (chain) => {
    return <span className={`badge ${chain.toLowerCase()}`}>{chain.toUpperCase()}</span>;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          流动性池 ({pools.length})
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>链</th>
              <th>DEX</th>
              <th>交易对</th>
              <th>当前价格</th>
              <th>储备量 Token0</th>
              <th>储备量 Token1</th>
              <th>24h 交易量</th>
              <th>24h 交易数</th>
              <th>1h 交易数</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <tr key={pool.id}>
                <td>{getChainBadge(pool.chain)}</td>
                <td style={{ textTransform: 'capitalize' }}>{pool.dex}</td>
                <td style={{ fontWeight: '600' }}>
                  {pool.token0_symbol}/{pool.token1_symbol}
                </td>
                <td>{pool.current_price > 0 ? pool.current_price.toFixed(6) : '-'}</td>
                <td>{formatNumber(pool.reserve0)}</td>
                <td>{formatNumber(pool.reserve1)}</td>
                <td>
                  {pool.volume_24h > 0 ? (
                    <span style={{ color: '#00ba7c', fontWeight: '600' }}>
                      ${formatNumber(pool.volume_24h)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{pool.tx_count_24h || 0}</td>
                <td>
                  {pool.tx_count_1h > 0 ? (
                    <span style={{ color: '#1d9bf0', fontWeight: '600' }}>
                      {pool.tx_count_1h}
                    </span>
                  ) : (
                    '0'
                  )}
                </td>
                <td style={{ fontSize: '12px', color: '#71767b' }}>
                  {new Date(pool.updated_at).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        backgroundColor: '#1e2126', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#71767b'
      }}>
        💡 提示: 点击池子可以查看详细信息和历史数据（功能开发中）
      </div>
    </div>
  );
}

