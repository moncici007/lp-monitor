import { useState, useEffect } from 'react';
import { formatRelativeTime, formatAddress } from '../utils/format';

const alertTypeLabels = {
  large_buy: '大额买入',
  large_sell: '大额卖出',
  liquidity_surge: '流动性激增',
  liquidity_drain: '流动性流失',
  high_volume: '交易量激增',
  price_spike: '价格异动',
};

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const unreadOnly = filter === 'unread' ? 'true' : 'false';
      const res = await fetch(`/api/alerts?unreadOnly=${unreadOnly}&limit=100`);
      const data = await res.json();

      if (data.success) {
        setAlerts(data.data.alerts);
      }
    } catch (error) {
      console.error('获取警报列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(alertIds) {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertIds }),
      });

      if (res.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('标记警报失败:', error);
    }
  }

  async function markAllAsRead() {
    const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">警报中心</h1>
          <p className="mt-2 text-gray-600">套利机会和风险警报</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            全部标为已读
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          全部警报
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-md ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          未读警报
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">⏳</div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">
            {filter === 'unread' ? '没有未读警报' : '暂无警报'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
                !alert.is_read ? 'border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        severityColors[alert.severity]
                      }`}
                    >
                      {alert.severity === 'low' && '低'}
                      {alert.severity === 'medium' && '中'}
                      {alert.severity === 'high' && '高'}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                      {alertTypeLabels[alert.alert_type] || alert.alert_type}
                    </span>
                    {!alert.is_read && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        未读
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {alert.title}
                  </h3>

                  <p className="text-gray-600 mb-3">{alert.description}</p>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>交易对: {formatAddress(alert.pair_address)}</span>
                    <span>时间: {formatRelativeTime(alert.timestamp)}</span>
                  </div>
                </div>

                {!alert.is_read && (
                  <button
                    onClick={() => markAsRead([alert.id])}
                    className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    标记已读
                  </button>
                )}
              </div>

              {/* 查看详情链接 */}
              <div className="mt-4 pt-4 border-t">
                <a
                  href={`/pairs/${alert.pair_address}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  查看交易对详情 →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

