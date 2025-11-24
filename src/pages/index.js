import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import PairCard from '../components/PairCard';
import { formatNumber } from '../utils/format';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [recentPairs, setRecentPairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // 每30秒刷新一次
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [statsRes, pairsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/pairs?limit=6'),
      ]);

      const statsData = await statsRes.json();
      const pairsData = await pairsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (pairsData.success) {
        setRecentPairs(pairsData.data.pairs);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">⏳</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
        <p className="mt-2 text-gray-600">
          实时监控BSC链上PancakeSwap V2的流动性池创建和交易活动
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="监控中的交易对"
          value={formatNumber(stats?.totalPairs || 0)}
          icon="💎"
        />
        <StatCard
          title="24小时交易数"
          value={formatNumber(stats?.transactions24h || 0)}
          icon="💱"
        />
        <StatCard
          title="24小时流动性事件"
          value={formatNumber(stats?.liquidityEvents24h || 0)}
          icon="💧"
        />
        <StatCard
          title="未读警报"
          value={formatNumber(stats?.unreadAlerts || 0)}
          icon="🔔"
        />
      </div>

      {/* 最近1小时活动 */}
      {stats?.lastHour && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            最近1小时活动
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">活跃交易对</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.lastHour.activePairs}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">交易笔数</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.lastHour.transactions}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">大额交易</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.lastHour.largeTransactions}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 最新创建的交易对 */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            最新创建的交易对
          </h2>
          <a
            href="/pairs"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            查看全部 →
          </a>
        </div>

        {recentPairs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">暂无数据</p>
            <p className="text-gray-400 mt-2">
              请确保监控服务正在运行
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPairs.map((pair) => (
              <PairCard key={pair.id} pair={pair} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

