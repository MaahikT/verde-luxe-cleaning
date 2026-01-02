import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface MonthlyRevenueCardProps {
  current: number;
  previous: number;
  changePercent: number;
}

export function MonthlyRevenueCard({ current, previous, changePercent }: MonthlyRevenueCardProps) {
  const isPositive = changePercent >= 0;

  return (
    <div className="flex flex-col gap-3 bg-brand-white rounded-[20px] p-5 h-[150px] shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-green-soft rounded-full flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-brand-accent-green" />
          </div>
          <h3 className="text-lg font-medium text-brand-black">Monthly Revenue</h3>
        </div>
      </div>

      <div className="flex items-center gap-0 relative mt-auto">
        <div className="text-3xl font-medium text-brand-black tracking-tight">${current.toFixed(2)}</div>
        <div className="flex flex-col items-end gap-1 ml-auto">
            <div className={`flex items-center gap-0.5 px-2 py-1 rounded-lg ${
            isPositive ? "bg-brand-accent-green/10 text-brand-accent-green" : "bg-brand-red/10 text-brand-red"
            }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="font-sans text-sm font-semibold">{Math.abs(changePercent).toFixed(1)}%</span>
            </div>
            <span className="text-brand-grey text-[10px] font-medium tracking-wide opacity-80 whitespace-nowrap">
            vs ${previous.toFixed(0)} prev
            </span>
        </div>
      </div>
    </div>
  );
}
