export default function StatsOverview({ data }) {
  if (!data || !data.success) {
    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  const { summary, monitor_status, alerts } = data;

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(0);
  };

  const formatUSD = (num) => {
    return '$' + formatNumber(num);
  };

  return (
    <>
      <div className="stats-grid">
        {/* 总池子数 */}
        <div className="stat-card">
          <div className="stat-label">监控池子总数</div>
          <div className="stat-value">{summary.total_pools || 0}</div>
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#71767b' }}>
            BSC: {summary.bsc_pools || 0} | Solana: {summary.solana_pools || 0}
          </div>
        </div>

        {/* 24小时交易量 */}
        <div className="stat-card">
          <div className="stat-label">24小时交易量</div>
          <div className="stat-value">{formatUSD(summary.volume_24h || 0)}</div>
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#71767b' }}>
            最近1小时: {formatUSD(summary.volume_1h || 0)}
          </div>
        </div>

        {/* 24小时交易数 */}
        <div className="stat-card">
          <div className="stat-label">24小时交易数</div>
          <div className="stat-value">{summary.tx_24h || 0}</div>
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#71767b' }}>
            最近1小时: {summary.tx_1h || 0}
          </div>
        </div>

        {/* 未读预警 */}
        <div className="stat-card">
          <div className="stat-label">未读预警</div>
          <div className="stat-value" style={{ color: alerts.unread_count > 0 ? '#f4212e' : '#e7e9ea' }}>
            {alerts.unread_count || 0}
          </div>
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#71767b' }}>
            最近1小时新增: {alerts.new_1h || 0}
          </div>
        </div>
      </div>

      {/* 监控状态 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">监控服务状态</div>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {monitor_status && monitor_status.map((status) => (
            <div key={status.chain} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '12px 20px',
              backgroundColor: '#1e2126',
              borderRadius: '8px',
              flex: '1',
              minWidth: '200px'
            }}>
              <span className={`status-dot ${status.is_running ? 'online' : 'offline'}`}></span>
              <div>
                <div style={{ fontWeight: '600', textTransform: 'uppercase' }}>
                  {status.chain}
                </div>
                <div style={{ fontSize: '12px', color: '#71767b', marginTop: '4px' }}>
                  {status.is_running ? '运行中' : '已停止'}
                  {status.last_sync_time && (
                    <span> • {new Date(status.last_sync_time).toLocaleTimeString('zh-CN')}</span>
                  )}
                </div>
                {status.last_error && (
                  <div style={{ fontSize: '11px', color: '#f4212e', marginTop: '4px' }}>
                    错误: {status.last_error.substring(0, 50)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

