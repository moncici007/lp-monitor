import { useState } from 'react';

export default function AlertList({ data, error }) {
  const [dismissing, setDismissing] = useState(false);

  if (error) {
    return (
      <div className="card">
        <div className="error">加载预警列表失败: {error.message}</div>
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

  const { alerts, unread_count } = data;

  const handleMarkAllRead = async () => {
    if (dismissing) return;
    
    setDismissing(true);
    try {
      const response = await fetch('/api/alerts/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mark_all: true }),
      });

      if (response.ok) {
        // 刷新数据
        window.location.reload();
      }
    } catch (error) {
      console.error('标记失败:', error);
    } finally {
      setDismissing(false);
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      await fetch('/api/alerts/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alert_id: alertId }),
      });
      
      // 刷新数据
      window.location.reload();
    } catch (error) {
      console.error('标记失败:', error);
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          🎉 太好了！暂无预警
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            系统会自动监控大额交易并在此处显示
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

  const getAlertTypeLabel = (type) => {
    const labels = {
      large_swap: '🔥 大额交换',
      large_liquidity_add: '💰 大额添加流动性',
      large_liquidity_remove: '⚠️ 大额移除流动性'
    };
    return labels[type] || type;
  };

  const getChainBadge = (chain) => {
    return <span className={`badge ${chain.toLowerCase()}`}>{chain.toUpperCase()}</span>;
  };

  const shortenHash = (hash) => {
    if (!hash) return '-';
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 6);
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
          预警列表 ({alerts.length})
          {unread_count > 0 && (
            <span className="alert-badge" style={{ marginLeft: '12px' }}>
              {unread_count} 未读
            </span>
          )}
        </div>
        {unread_count > 0 && (
          <button 
            className="btn btn-secondary" 
            onClick={handleMarkAllRead}
            disabled={dismissing}
          >
            {dismissing ? '处理中...' : '全部标记为已读'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              padding: '16px',
              backgroundColor: alert.is_read ? '#16181c' : '#1e2126',
              border: alert.is_read ? '1px solid #2f3336' : '2px solid #f4212e',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                {/* 预警类型和时间 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px' }}>
                    {getAlertTypeLabel(alert.alert_type)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#71767b' }}>
                    {formatTimeAgo(alert.created_at)}
                  </span>
                  {!alert.is_read && (
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: '#f4212e',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      NEW
                    </span>
                  )}
                </div>

                {/* 详细信息 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#71767b', marginBottom: '4px' }}>链</div>
                    <div>{getChainBadge(alert.chain)}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#71767b', marginBottom: '4px' }}>交易对</div>
                    <div style={{ fontWeight: '600' }}>{alert.pair}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#71767b', marginBottom: '4px' }}>交易金额</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: '700',
                      color: '#f4212e'
                    }}>
                      ${formatNumber(alert.usd_value)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#71767b', marginBottom: '4px' }}>阈值</div>
                    <div>${formatNumber(alert.threshold_usd)}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#71767b', marginBottom: '4px' }}>交易哈希</div>
                    <a 
                      href={getExplorerUrl(alert.chain, alert.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#1d9bf0',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}
                    >
                      {shortenHash(alert.tx_hash)}
                    </a>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              {!alert.is_read && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleMarkRead(alert.id)}
                  style={{ marginLeft: '16px' }}
                >
                  标记已读
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {unread_count === 0 && alerts.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          color: '#71767b',
          fontSize: '14px'
        }}>
          ✅ 所有预警已读
        </div>
      )}
    </div>
  );
}

