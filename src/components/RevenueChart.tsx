import { TrendingUp, DollarSign } from "lucide-react";

interface RevenueTrend {
  month: string;
  monthKey: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueTrend[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Calculate max revenue for scaling
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = totalRevenue / data.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue Trends</h3>
          <p className="text-sm text-gray-600">Last 6 months performance</p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-green-600" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <p className="text-sm text-green-700 mb-1">Total (6 months)</p>
          <p className="text-2xl font-bold text-green-900">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-blue-700 mb-1">Monthly Average</p>
          <p className="text-2xl font-bold text-blue-900">${avgRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-3">
        {data.map((item, index) => {
          const heightPercent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
          const isHighest = item.revenue === maxRevenue && maxRevenue > 0;

          return (
            <div key={item.monthKey} className="group">
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-gray-700">
                  {item.month}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        isHighest
                          ? "bg-gradient-to-r from-green-500 to-emerald-600"
                          : "bg-gradient-to-r from-primary to-primary-dark"
                      }`}
                      style={{ width: `${heightPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20"></div>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      ${item.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No revenue data available yet</p>
        </div>
      )}
    </div>
  );
}
