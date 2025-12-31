import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface MonthlyBookingsCardProps {
  current: number;
  previous: number;
  changePercent: number;
}

export function MonthlyBookingsCard({ current, previous, changePercent }: MonthlyBookingsCardProps) {
  const isPositive = changePercent >= 0;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>
      </div>
      
      <p className="text-gray-600 text-xs mb-0.5">Monthly Bookings</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {current}
      </p>
      
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(changePercent).toFixed(1)}%</span>
        </div>
        <span className="text-xs text-gray-500">vs last month</span>
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        Previous: {previous}
      </p>
    </div>
  );
}
