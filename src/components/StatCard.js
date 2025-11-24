export default function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0">
            <span className="text-4xl">{icon}</span>
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center text-sm">
          <span
            className={`font-medium ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="ml-2 text-gray-500">与上一小时相比</span>
        </div>
      )}
    </div>
  );
}

