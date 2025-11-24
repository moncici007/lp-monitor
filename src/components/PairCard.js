import Link from 'next/link';
import { formatAddress, formatRelativeTime, getBscScanLink } from '../utils/format';

export default function PairCard({ pair }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {pair.token0_symbol || 'Token0'} / {pair.token1_symbol || 'Token1'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {pair.token0_name || 'Unknown'} / {pair.token1_name || 'Unknown'}
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          新建
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">交易对地址:</span>
          <a
            href={getBscScanLink(pair.address, 'address')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-mono"
          >
            {formatAddress(pair.address)}
          </a>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Token0:</span>
          <a
            href={getBscScanLink(pair.token0_address, 'token')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-mono"
          >
            {formatAddress(pair.token0_address)}
          </a>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Token1:</span>
          <a
            href={getBscScanLink(pair.token1_address, 'token')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-mono"
          >
            {formatAddress(pair.token1_address)}
          </a>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">创建时间:</span>
          <span className="text-gray-900">
            {formatRelativeTime(pair.created_at)}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Link
          href={`/pairs/${pair.address}`}
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          查看详情
        </Link>
      </div>
    </div>
  );
}

