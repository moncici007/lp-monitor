import { useState, useEffect } from 'react';
import PairCard from '../../components/PairCard';

export default function PairsPage() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 12,
    offset: 0,
  });

  useEffect(() => {
    fetchPairs();
  }, [pagination.offset]);

  async function fetchPairs() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/pairs?limit=${pagination.limit}&offset=${pagination.offset}`
      );
      const data = await res.json();

      if (data.success) {
        setPairs(data.data.pairs);
        setPagination((prev) => ({
          ...prev,
          total: data.data.total,
        }));
      }
    } catch (error) {
      console.error('获取交易对列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  function goToPage(page) {
    const newOffset = (page - 1) * pagination.limit;
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">交易对列表</h1>
        <p className="mt-2 text-gray-600">
          共 {pagination.total} 个交易对正在监控中
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">⏳</div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      ) : pairs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">暂无交易对数据</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pairs.map((pair) => (
              <PairCard key={pair.id} pair={pair} />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>

              <span className="px-4 py-2 text-gray-700">
                第 {currentPage} / {totalPages} 页
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

