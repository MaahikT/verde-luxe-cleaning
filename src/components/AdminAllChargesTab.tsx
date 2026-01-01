import { useState } from "react";
import { createPortal } from "react-dom";
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
  ChevronLeft,
  CreditCard,
  ArrowRight
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
  const [selectedPayment, setSelectedPayment] = useState<any>(null); // This is now the GROUP
  const [refundTargetPayment, setRefundTargetPayment] = useState<any>(null); // This is the specific payment to refund
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
        // Close modal or go back to list?
        // Let's go back to list to see updated status
        setRefundTargetPayment(null);
        setRefundAmount("");
        setRefundReason("requested_by_customer");
        // Update the selected Group locally? Or just wait for refetch.
        // For simplicity, just close modal on success or wait for refetch logic
        setShowRefundModal(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to issue refund");
      },
    })
  );

  const handleRefundClick = (payment: any) => {
    setRefundTargetPayment(payment);
    setRefundAmount(payment.amount.toFixed(2)); // Default to full refund
  };

  const handleConfirmRefund = () => {
    if (!refundTargetPayment) return;

    const amountValue = parseFloat(refundAmount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (amountValue > refundTargetPayment.amount) {
      toast.error("Refund amount cannot exceed the original charge");
      return;
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amountValue * 100);

    issueRefundMutation.mutate({
      authToken: token || "",
      paymentId: refundTargetPayment.id,
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

  // Group payments by booking ID
  const groupedPayments = payments.reduce((acc: any, payment: any) => {
    if (!payment.booking) return acc;

    const bookingId = payment.booking.id;
    if (!acc[bookingId]) {
      acc[bookingId] = {
        booking: payment.booking,
        payments: [],
        netAmount: 0,
        latestDate: new Date(0) // Initialize with old date
      };
    }

    acc[bookingId].payments.push(payment);
    acc[bookingId].netAmount += payment.amount;

    // Track latest activity date for sorting
    const paymentDate = payment.paidAt ? new Date(payment.paidAt) : new Date();
    if (paymentDate > acc[bookingId].latestDate) {
      acc[bookingId].latestDate = paymentDate;
    }

    return acc;
  }, {});

  const sortedGroups = Object.values(groupedPayments).sort((a: any, b: any) =>
    b.latestDate.getTime() - a.latestDate.getTime()
  );

  const isLoading = allChargesQuery.isLoading;
  const isError = allChargesQuery.isError;

  // Calculate Revenue for the selected period ONLY
  const paymentsInPeriod = payments.filter((p) => {
      if (!startDate && !endDate) return true;
      if (!p.paidAt) return false;
      const paidDate = new Date(p.paidAt);

      const EST_OFFSET = 5;
      if (startDate) {
          const start = new Date(startDate);
          start.setUTCHours(EST_OFFSET, 0, 0, 0);
          if (paidDate < start) return false;
      }
      if (endDate) {
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1);
          end.setUTCHours(EST_OFFSET - 1, 59, 59, 999);
          if (paidDate > end) return false;
      }
      return true;
  });

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
      ) : sortedGroups.length === 0 ? (
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
                Bookings with Charges ({sortedGroups.length})
              </h3>
              <div className="text-sm text-gray-600">
                Total Net Revenue: ${paymentsInPeriod.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
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
                {(sortedGroups as any[]).map((group) => (
                  <tr key={group.booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(group.latestDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            Latest activity
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {group.booking.client.firstName} {group.booking.client.lastName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{group.booking.client.email}</span>
                            </div>
                            {group.booking.client.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{formatPhoneNumber(group.booking.client.phone)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{group.booking.id}
                        </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(group.booking.scheduledDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                    </td>

                    <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-xs">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-900 line-clamp-2">
                            {group.booking.address}
                          </div>
                        </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold ${group.netAmount < 0 ? "text-red-600" : "text-green-600"}`}>
                        {group.netAmount < 0
                          ? `-$${Math.abs(group.netAmount).toFixed(2)}`
                          : `$${group.netAmount.toFixed(2)}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                         {group.payments.length} transaction{group.payments.length !== 1 ? 's' : ''}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                             // We'll use the selectedPayment state primarily as a container for the group for modal purposes,
                             // or we can add a new state `selectedGroup`.
                             // To minimize code changes, let's treat the 'payment' state as the 'group' object for now,
                             // but we need to check types.
                             // Actually, let's just piggyback on selectedPayment or add a small hack.
                             // Better: Set selectedPayment to null and create a new state or just adapt the modal.
                             // Since I can't easily add state in replace_file_content (needs full file re-write or careful insertion),
                             // I'll reuse `selectedPayment` but store the GROUP there and update the modal rendering logic.
                             setSelectedPayment(group as any);
                             setShowRefundModal(true);
                        }}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
                      >
                         <RotateCcw className="w-4 h-4" />
                         Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund / Details Modal */}
      {showRefundModal && selectedPayment && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            {!refundTargetPayment ? (
               // --- TRANSACTION LIST VIEW ---
               <div className="p-6 flex-1 overflow-y-auto">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                       <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                       <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                       <p className="text-sm text-gray-600">
                          Booking #{selectedPayment.booking.id} • Net Total: <span className={selectedPayment.netAmount < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                            ${selectedPayment.netAmount.toFixed(2)}
                          </span>
                       </p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    {selectedPayment.payments.map((p: any) => (
                       <div key={p.id} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.amount < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                   {p.amount < 0 ? <RotateCcw className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                </div>
                                <div>
                                   <div className="text-sm font-medium text-gray-900">
                                      {p.amount < 0 ? "Refund Issued" : "Payment Captured"}
                                   </div>
                                   <div className="text-xs text-gray-500">
                                      {new Date(p.paidAt).toLocaleString()}
                                   </div>
                                </div>
                             </div>
                             <div className={`font-bold ${p.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {p.amount < 0 ? `-$${Math.abs(p.amount).toFixed(2)}` : `$${p.amount.toFixed(2)}`}
                             </div>
                          </div>

                          {p.description && (
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                               {p.description}
                            </div>
                          )}

                          {p.amount > 0 && (
                             <button
                               onClick={() => handleRefundClick(p)}
                               className="self-end text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                             >
                                <RotateCcw className="w-3 h-3" />
                                Issue Refund
                             </button>
                          )}
                       </div>
                    ))}
                 </div>
               </div>
            ) : (
                // --- REFUND FORM VIEW ---
                <div className="p-6">
                  <button
                    onClick={() => setRefundTargetPayment(null)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
                  >
                     <ChevronLeft className="w-4 h-4" />
                     Back to Transactions
                  </button>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Issue Refund</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Refund for Payment #{refundTargetPayment.id}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                        // Calculate remaining refundable amount
                        const originalAmount = refundTargetPayment.amount;
                        const relatedRefunds = selectedPayment.payments.filter((p: any) =>
                            p.stripePaymentIntentId === refundTargetPayment.stripePaymentIntentId &&
                            p.amount < 0
                        );
                        const alreadyRefunded = relatedRefunds.reduce((sum: number, p: any) => sum + Math.abs(p.amount), 0);
                        const maxRefundable = Math.max(0, originalAmount - alreadyRefunded);

                        return (
                          <>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Original Charge:</span>
                                <span className="text-sm font-bold text-gray-900">
                                  ${originalAmount.toFixed(2)}
                                </span>
                              </div>
                              {alreadyRefunded > 0 && (
                                <div className="flex items-center justify-between text-xs text-red-600 mb-2">
                                  <span>Already Refunded:</span>
                                  <span>-${alreadyRefunded.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <span className="text-sm font-medium text-gray-900">Remaining Refundable:</span>
                                <span className="text-sm font-bold text-green-600">
                                  ${maxRefundable.toFixed(2)}
                                </span>
                              </div>
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
                                  max={maxRefundable}
                                  step="0.01"
                                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                                  placeholder="Enter refund amount"
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Max refundable: ${maxRefundable.toFixed(2)}
                              </p>
                            </div>
                          </>
                        );
                    })()}

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
                        This action will process a refund through Stripe.
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
                  </div>
                </div>
            )}

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
               <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedPayment(null);
                    setRefundTargetPayment(null);
                    setRefundAmount("");
                  }}
                  className="w-full px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300"
                >
                  Close
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
