import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import {
  CreditCard,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  X,
  Loader,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

export function AdminCardHoldsTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelAction, setCancelAction] = useState<"void" | "cancel" | null>(null);

  // Fetch upcoming card holds
  const cardHoldsQuery = useQuery(
    trpc.getUpcomingCardHolds.queryOptions({
      authToken: token || "",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      searchTerm: searchTerm || undefined,
    })
  );

  // Mutation to cancel payment hold
  const cancelPaymentHoldMutation = useMutation(
    trpc.cancelPaymentHold.mutationOptions({
      onSuccess: () => {
        toast.success("Payment hold voided successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getUpcomingCardHolds.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        setShowCancelModal(false);
        setSelectedBooking(null);
        setCancelAction(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to void payment hold");
      },
    })
  );

  // Mutation to cancel booking
  const cancelBookingMutation = useMutation(
    trpc.updateBookingAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Booking cancelled successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getUpcomingCardHolds.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getBookingStatsAdmin.queryKey() });
        setShowCancelModal(false);
        setSelectedBooking(null);
        setCancelAction(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel booking");
      },
    })
  );

  // Mutation to capture payment hold (pre-charge)
  const capturePaymentMutation = useMutation(
    trpc.capturePaymentHold.mutationOptions({
      onSuccess: () => {
        toast.success("Payment captured successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getUpcomingCardHolds.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllCapturedCharges.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getBookingStatsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to capture payment");
      },
    })
  );

  const handleVoidPayment = (booking: any) => {
    setSelectedBooking(booking);
    setCancelAction("void");
    setShowCancelModal(true);
  };

  const handleCancelBooking = (booking: any) => {
    setSelectedBooking(booking);
    setCancelAction("cancel");
    setShowCancelModal(true);
  };

  const handlePreCharge = (booking: any) => {
    // Get the first uncaptured payment from the booking
    const payment = booking.payments?.[0];
    if (!payment) {
      toast.error("No payment found for this booking");
      return;
    }

    capturePaymentMutation.mutate({
      authToken: token || "",
      paymentId: payment.id,
    });
  };

  const handleConfirmCancel = () => {
    if (!selectedBooking) return;

    if (cancelAction === "void") {
      cancelPaymentHoldMutation.mutate({
        authToken: token || "",
        bookingId: selectedBooking.id,
      });
    } else if (cancelAction === "cancel") {
      cancelBookingMutation.mutate({
        authToken: token || "",
        bookingId: selectedBooking.id,
        status: "CANCELLED",
      });
    }
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  const bookings = cardHoldsQuery.data?.bookings || [];
  const isLoading = cardHoldsQuery.isLoading;
  const isError = cardHoldsQuery.isError;
  const isMutating = cancelPaymentHoldMutation.isPending || cancelBookingMutation.isPending || capturePaymentMutation.isPending;

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
            <p className="text-gray-600 font-medium">Loading card holds...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 rounded-lg border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading card holds</p>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg mb-1">No Active Holds</p>
              <p className="text-gray-600 text-sm">
                No upcoming bookings with active payment holds at the moment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Active Card Holds ({bookings.length})
              </h3>
              <div className="text-sm text-gray-600">
                Total Authorized: ${bookings.reduce((sum, b) => sum + (b.finalPrice || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Scheduled Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Booking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Cleaner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Hold Amount
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {(() => {
                              if (!booking.scheduledTime) return "";
                              const parts = booking.scheduledTime.split(':');
                              if (parts.length < 2) return booking.scheduledTime;
                              const hours = parseInt(parts[0]!);
                              const minutes = parseInt(parts[1]!);
                              const date = new Date();
                              date.setHours(hours, minutes);
                              return date.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.client.firstName} {booking.client.lastName}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{booking.client.email}</span>
                          </div>
                          {booking.client.phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{formatPhoneNumber(booking.client.phone)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        #{booking.id}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.cleaner ? (
                        <div className="text-sm text-gray-900">
                          {booking.cleaner.firstName} {booking.cleaner.lastName}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 max-w-xs">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-900 line-clamp-2">
                          {booking.address}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-600">
                        ${booking.finalPrice?.toFixed(2) || "0.00"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === "CONFIRMED"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {booking.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreCharge(booking)}
                          disabled={isMutating}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          title="Pre-charge this booking"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Pre-Charge
                        </button>
                        <button
                          onClick={() => handleVoidPayment(booking)}
                          disabled={isMutating}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Void payment hold"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancelBooking(booking)}
                          disabled={isMutating}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cancel booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1003] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  cancelAction === "void" ? "bg-orange-100" : "bg-red-100"
                }`}>
                  <AlertCircle className={`w-6 h-6 ${
                    cancelAction === "void" ? "text-orange-600" : "text-red-600"
                  }`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {cancelAction === "void" ? "Void Payment Hold?" : "Cancel Booking?"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Booking #{selectedBooking.id}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-900">
                  {cancelAction === "void"
                    ? "This will release the payment hold and the customer will not be charged. The booking will remain in the system."
                    : "This will cancel the booking and release the payment hold. The customer will not be charged."}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConfirmCancel}
                  disabled={isMutating}
                  className={`w-full px-4 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    cancelAction === "void"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isMutating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {cancelAction === "void" ? "Yes, Void Hold" : "Yes, Cancel Booking"}
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedBooking(null);
                    setCancelAction(null);
                  }}
                  disabled={isMutating}
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
