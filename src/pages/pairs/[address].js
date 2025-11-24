import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getBscScanLink,
  formatNumber,
} from '../../utils/format';

export default function PairDetailPage() {
  const router = useRouter();
  const { address } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchPairDetail();
      const interval = setInterval(fetchPairDetail, 15000);
      return () => clearInterval(interval);
    }
  }, [address]);

  async function fetchPairDetail() {
    try {
      const res = await fetch(`/api/pairs/${address}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('获取交易对详情失败:', error);
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

  if (!data || !data.pair) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 text-lg">交易对不存在</p>
      </div>
    );
  }

  const { pair, hourlyStats, recentTransactions, recentLiquidityEvents } = data;

  return (
    <div>
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
      >
        ← 返回
      </button>

      {/* 交易对信息 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {pair.token0_symbol} / {pair.token1_symbol}
            </h1>
            <p className="mt-2 text-gray-600">
              创建于 {formatRelativeTime(pair.created_at)}
            </p>
          </div>
          <a
            href={getBscScanLink(pair.address, 'address')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            在BSCScan查看
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">交易对地址</h3>
            <p className="font-mono text-sm text-gray-900">{pair.address}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">储备量</h3>
            <p className="text-sm text-gray-900">
              {pair.token0_symbol}: {formatTokenAmount(pair.reserve0, pair.token0_decimals)}
            </p>
            <p className="text-sm text-gray-900">
              {pair.token1_symbol}: {formatTokenAmount(pair.reserve1, pair.token1_decimals)}
            </p>
          </div>
        </div>
      </div>

      {/* 最近1小时统计 */}
      {hourlyStats && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            最近1小时统计
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">交易笔数</p>
              <p className="text-2xl font-bold text-blue-600">
                {hourlyStats.transaction_count || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">大额交易</p>
              <p className="text-2xl font-bold text-green-600">
                {hourlyStats.large_transaction_count || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">交易量 (Token0)</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatNumber(formatTokenAmount(hourlyStats.volume_token0, pair.token0_decimals))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 最近交易 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">最近交易</h2>
        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    交易哈希
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    发送者
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatRelativeTime(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          tx.amount0_in > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.amount0_in > 0 ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={getBscScanLink(tx.transaction_hash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-mono"
                      >
                        {formatAddress(tx.transaction_hash)}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      {formatAddress(tx.sender)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无交易数据</p>
        )}
      </div>

      {/* 流动性事件 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          流动性变化
        </h2>
        {recentLiquidityEvents && recentLiquidityEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    数量0
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    数量1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    交易哈希
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLiquidityEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatRelativeTime(event.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          event.event_type === 'mint'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {event.event_type === 'mint' ? '添加' : '移除'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTokenAmount(event.amount0, pair.token0_decimals)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTokenAmount(event.amount1, pair.token1_decimals)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={getBscScanLink(event.transaction_hash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-mono"
                      >
                        {formatAddress(event.transaction_hash)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无流动性数据</p>
        )}
      </div>
    </div>
  );
}

