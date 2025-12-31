import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { toast } from "react-hot-toast";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";
import {
  XCircle,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Search,
  Filter,
  AlertTriangle,
  X,
  RefreshCw,
  Loader,
} from "lucide-react";

export function AdminDeclinedChargesTab() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch declined charges
  const declinedChargesQuery = useQuery(
    trpc.getDeclinedCharges.queryOptions({
      authToken: token || "",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      searchTerm: searchTerm || undefined,
    })
  );

  // Mutation to retry failed payment
  const retryPaymentMutation = useMutation(
    trpc.retryChargeOrHold.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success(data.message || "Payment retry successful!");
        } else {
          toast.error(data.message || "Payment retry failed. Please check the payment method.");
        }
        queryClient.invalidateQueries({ queryKey: trpc.getDeclinedCharges.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllCapturedCharges.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getBookingStatsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to retry payment");
      },
    })
  );

  const handleRetryPayment = (payment: any) => {
    retryPaymentMutation.mutate({
      authToken: token || "",
      paymentId: payment.id,
    });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  const payments = declinedChargesQuery.data?.payments || [];
  const isLoading = declinedChargesQuery.isLoading;
  const isError = declinedChargesQuery.isError;
  const isRetrying = retryPaymentMutation.isPending;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "canceled":
        return "bg-orange-100 text-orange-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "requires_payment_method":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "canceled":
        return "Canceled";
      case "failed":
        return "Failed";
      case "requires_payment_method":
        return "Payment Method Required";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, phone, address..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              />
            </div>
          </div>
        </div>

        {(startDate || endDate || searchTerm) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading declined charges...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 rounded-lg border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading declined charges</p>
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg mb-1">No Declined Charges</p>
              <p className="text-gray-600 text-sm">
                No failed or canceled payment attempts found.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Declined Charges ({payments.length})
              </h3>
              <div className="text-sm text-gray-600">
                Total Failed: ${payments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Date Attempted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Booking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Service Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-900">
                          {new Date(payment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {payment.booking ? (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.booking.client.firstName} {payment.booking.client.lastName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{payment.booking.client.email}</span>
                            </div>
                            {payment.booking.client.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{formatPhoneNumber(payment.booking.client.phone)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">No booking</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.booking ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{payment.booking.id}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.booking ? (
                        <div className="text-sm text-gray-900">
                          {new Date(payment.booking.scheduledDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {payment.booking ? (
                        <div className="flex items-start gap-2 max-w-xs">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-900 line-clamp-2">
                            {payment.booking.address}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">
                        ${payment.amount?.toFixed(2) || "0.00"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status || "")}`}>
                        {getStatusLabel(payment.status || "")}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRetryPayment(payment)}
                        disabled={isRetrying}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title="Retry this payment"
                      >
                        {isRetrying ? (
                          <>
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry Payment
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
