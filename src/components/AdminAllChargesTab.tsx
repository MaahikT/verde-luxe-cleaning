import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import {
  CheckCircle,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Search,
  Filter,
  X,
  XCircle,
  DollarSign,
  Loader,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

export function AdminAllChargesTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<"requested_by_customer" | "duplicate" | "fraudulent">("requested_by_customer");

  // Fetch all captured charges
  const allChargesQuery = useQuery(
    trpc.getAllCapturedCharges.queryOptions({
      authToken: token || "",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      searchTerm: searchTerm || undefined,
    })
  );

  // Mutation to issue refund
  const issueRefundMutation = useMutation(
    trpc.issueRefund.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Refund of $${data.amount.toFixed(2)} issued successfully!`);
        queryClient.invalidateQueries({ queryKey: trpc.getAllCapturedCharges.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getBookingStatsAdmin.queryKey() });
        setShowRefundModal(false);
        setSelectedPayment(null);
        setRefundAmount("");
        setRefundReason("requested_by_customer");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to issue refund");
      },
    })
  );

  const handleRefundClick = (payment: any) => {
    setSelectedPayment(payment);
    setRefundAmount(payment.amount.toFixed(2)); // Default to full refund
    setShowRefundModal(true);
  };

  const handleConfirmRefund = () => {
    if (!selectedPayment) return;

    const amountValue = parseFloat(refundAmount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (amountValue > selectedPayment.amount) {
      toast.error("Refund amount cannot exceed the original charge");
      return;
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amountValue * 100);

    issueRefundMutation.mutate({
      authToken: token || "",
      paymentId: selectedPayment.id,
      amount: amountInCents,
      reason: refundReason,
    });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  const payments = allChargesQuery.data?.payments || [];
  const isLoading = allChargesQuery.isLoading;
  const isError = allChargesQuery.isError;

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
            <p className="text-gray-600 font-medium">Loading charges...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 rounded-lg border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading charges</p>
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg mb-1">No Charges Yet</p>
              <p className="text-gray-600 text-sm">
                Completed charges will appear here after bookings are serviced and payments are captured.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                All Charges ({payments.length})
              </h3>
              <div className="text-sm text-gray-600">
                Total Revenue: ${payments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Payment Date
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
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }) : 'N/A'}
                          </div>
                          {payment.paidAt && (
                            <div className="text-xs text-gray-600">
                              {new Date(payment.paidAt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>
                          )}
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
                      <div className="text-sm font-semibold text-green-600">
                        ${payment.amount?.toFixed(2) || "0.00"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRefundClick(payment)}
                        disabled={issueRefundMutation.isPending}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title="Issue refund"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Refund
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1003] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Issue Refund</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Payment #{selectedPayment.id}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Original Amount:</span>
                    <span className="text-sm font-bold text-gray-900">
                      ${selectedPayment.amount.toFixed(2)}
                    </span>
                  </div>
                  {selectedPayment.booking && (
                    <>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Customer:</span>
                        <span>
                          {selectedPayment.booking.client.firstName} {selectedPayment.booking.client.lastName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                        <span>Booking:</span>
                        <span>#{selectedPayment.booking.id}</span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      min="0.01"
                      max={selectedPayment.amount}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                      placeholder="Enter refund amount"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter full amount for complete refund, or partial amount
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  >
                    <option value="requested_by_customer">Requested by Customer</option>
                    <option value="duplicate">Duplicate Charge</option>
                    <option value="fraudulent">Fraudulent</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    This action will process a refund through Stripe. The funds will be returned to the customer's original payment method.
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <button
                  onClick={handleConfirmRefund}
                  disabled={issueRefundMutation.isPending}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {issueRefundMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing Refund...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Refund
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedPayment(null);
                    setRefundAmount("");
                    setRefundReason("requested_by_customer");
                  }}
                  disabled={issueRefundMutation.isPending}
                  className="w-full px-4 py-3 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
