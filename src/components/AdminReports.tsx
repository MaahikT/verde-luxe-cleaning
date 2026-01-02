import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { DollarSign, TrendingUp, Clock, Repeat, Calendar, XCircle, Loader } from "lucide-react";

// Utility function to get the current week's start (Sunday) and end (Saturday) dates
const getCurrentWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  // Calculate start of the week (Sunday)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek);

  // Calculate end of the week (Saturday)
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + (6 - dayOfWeek));

  // Format dates as YYYY-MM-DD strings
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
};

export function AdminReports() {
  const trpc = useTRPC();
  const { token } = useAuthStore();

  // Get current week dates for default values
  const { start: defaultStart, end: defaultEnd } = getCurrentWeekDates();

  // State for date range inputs
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // State for applied filters (what's actually sent to the API)
  const [appliedStartDate, setAppliedStartDate] = useState<string | undefined>(defaultStart);
  const [appliedEndDate, setAppliedEndDate] = useState<string | undefined>(defaultEnd);

  // Helper function to parse date string in local time (avoids UTC timezone issues)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year!, month! - 1, day!); // month is 0-indexed
  };

  // Fetch revenue report data
  const revenueQuery = useQuery(
    trpc.getRevenueReport.queryOptions({
      authToken: token || "",
      startDate: appliedStartDate,
      endDate: appliedEndDate,
    })
  );

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate || undefined);
    setAppliedEndDate(endDate || undefined);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate(undefined);
    setAppliedEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Revenue Reports</h2>
            <p className="text-gray-600">View detailed revenue breakdowns and metrics</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilter}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Apply
              </button>
              {(appliedStartDate || appliedEndDate) && (
                <button
                  onClick={handleClearFilter}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {(appliedStartDate || appliedEndDate) && (
            <div className="mt-3 text-sm text-gray-600">
              <span className="font-medium">Active Filter:</span>{" "}
              {appliedStartDate && (
                <span>
                  From {parseLocalDate(appliedStartDate).toLocaleDateString()}
                </span>
              )}
              {appliedStartDate && appliedEndDate && <span> </span>}
              {appliedEndDate && (
                <span>
                  To {parseLocalDate(appliedEndDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {revenueQuery.isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-12 h-12 text-primary animate-spin" />
            <p className="text-gray-600 font-medium">Loading revenue data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {revenueQuery.isError && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading revenue data</p>
            <p className="text-red-700 text-sm">Please try again later</p>
          </div>
        </div>
      )}

      {/* Revenue Card */}
      {revenueQuery.isSuccess && revenueQuery.data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Revenue Summary</h3>
            </div>
            <p className="text-green-100 text-sm">
              Comprehensive revenue breakdown
              {(appliedStartDate || appliedEndDate) && " for selected period"}
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6">
            {/* Total Revenue - Highlighted */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border-2 border-green-200">
              <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
                Total Revenue
              </p>
              <p className="text-4xl font-bold text-green-900">
                ${revenueQuery.data.totalRevenue.toFixed(2)}
              </p>
            </div>

            {/* Revenue Breakdown Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Billed Revenue */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-blue-700">Billed Revenue</p>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  ${revenueQuery.data.billedRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">From completed bookings</p>
              </div>

              {/* Pending Payments */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-yellow-700">Pending Payments</p>
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-900">
                  ${revenueQuery.data.pendingRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-yellow-600 mt-1">From upcoming bookings</p>
              </div>

              {/* Recurring Revenue */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-purple-700">Recurring Revenue</p>
                  <Repeat className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  ${revenueQuery.data.recurringRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 mt-1">From repeat bookings</p>
              </div>

              {/* Monthly Revenue */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-pink-700">Monthly Revenue</p>
                  <Calendar className="w-5 h-5 text-pink-600" />
                </div>
                <p className="text-2xl font-bold text-pink-900">
                  ${revenueQuery.data.monthlyRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-pink-600 mt-1">Monthly frequency bookings</p>
              </div>

              {/* Biweekly Revenue */}
              <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg p-4 border border-cyan-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-cyan-700">Every-Other-Week Revenue</p>
                  <Calendar className="w-5 h-5 text-cyan-600" />
                </div>
                <p className="text-2xl font-bold text-cyan-900">
                  ${revenueQuery.data.biweeklyRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-cyan-600 mt-1">Biweekly frequency bookings</p>
              </div>

              {/* Weekly Revenue */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-orange-700">Weekly Revenue</p>
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  ${revenueQuery.data.weeklyRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-orange-600 mt-1">Weekly frequency bookings</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
