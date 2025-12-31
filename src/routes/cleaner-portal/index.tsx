import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { PortalLayout } from "~/components/PortalLayout";
import { DashboardHeader } from "~/components/DashboardHeader";
import { Calendar, DollarSign, LogOut, Clock, MapPin, User, CheckCircle, XCircle, Loader, AlertCircle, TrendingUp, Wallet, Clock3, CheckSquare, Square, CalendarOff, Send, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { formatTime12Hour, formatDurationHours } from "~/utils/formatTime";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CleanerCalendarView } from "~/components/CleanerCalendarView";

interface Booking {
  id: number;
  clientId: number;
  cleanerId: number | null;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  durationHours: number | null;
  address: string;
  specialInstructions: string | null;
  finalPrice: number | null;
  serviceFrequency: string | null;
  houseSquareFootage: number | null;
  basementSquareFootage: number | null;
  numberOfBedrooms: number | null;
  numberOfBathrooms: number | null;
  numberOfCleanersRequested: number | null;
  cleanerPaymentAmount: number | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  client: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  cleaner: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  } | null;
  checklist?: {
    id: number;
    items: {
      id: number;
      description: string;
      order: number;
      isCompleted: boolean;
      completedAt: string | null;
      completedBy: number | null;
    }[];
    template: {
      name: string;
      serviceType: string;
    };
  } | null;
}

const cleanerPortalSearchSchema = z.object({
  view: z.enum(["dashboard", "schedule", "payments", "requests"]).default("dashboard"),
});

export const Route = createFileRoute("/cleaner-portal/")({
  component: CleanerPortalPage,
  validateSearch: zodValidator(cleanerPortalSearchSchema),
});

// Helper function to parse date string in local time (avoids UTC timezone issues)
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript Date constructor
  return new Date(year, month - 1, day);
};

function CleanerPortalPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token, user, clearAuth } = useAuthStore();
  const { view } = Route.useSearch();
  const [selectedBookingChecklist, setSelectedBookingChecklist] = useState<number | undefined>();
  const queryClient = useQueryClient();

  // State for date range inputs
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // State for applied filters (what's actually sent to the API)
  const [appliedStartDate, setAppliedStartDate] = useState<string | undefined>(undefined);
  const [appliedEndDate, setAppliedEndDate] = useState<string | undefined>(undefined);

  // State for editing time-off requests
  const [editingRequest, setEditingRequest] = useState<{
    id: number;
    startDate: string;
    endDate: string;
    reason?: string;
  } | null>(null);

  // Redirect if not authenticated or not a cleaner
  useEffect(() => {
    if (!token || !user) {
      toast.error("Please log in to access the cleaner portal");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "CLEANER") {
      toast.error("Access denied. Cleaner account required.");
      navigate({ to: "/" });
    }
  }, [token, user, navigate]);

  const scheduleQuery = useQuery(
    trpc.getSchedule.queryOptions({
      authToken: token || "",
    })
  );

  const paymentsQuery = useQuery(
    trpc.getPayments.queryOptions({
      authToken: token || "",
      startDate: appliedStartDate,
      endDate: appliedEndDate,
    })
  );

  const timeOffRequestsQuery = useQuery(
    trpc.getTimeOffRequests.queryOptions({
      authToken: token || "",
    })
  );

  const submitTimeOffRequestMutation = useMutation(
    trpc.submitTimeOffRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Time-off request submitted successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getTimeOffRequests.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to submit request");
      },
    })
  );

  const deleteTimeOffRequestMutation = useMutation(
    trpc.deleteTimeOffRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Request canceled successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getTimeOffRequests.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel request");
      },
    })
  );

  const updateTimeOffRequestMutation = useMutation(
    trpc.updateTimeOffRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Request updated successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getTimeOffRequests.queryKey() });
        setEditingRequest(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update request");
      },
    })
  );

  const updateChecklistItemMutation = useMutation(
    trpc.updateBookingChecklistItem.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist updated!");
        queryClient.invalidateQueries({ queryKey: trpc.getSchedule.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update checklist");
      },
    })
  );

  const handleToggleChecklistItem = (itemId: number, currentStatus: boolean) => {
    updateChecklistItemMutation.mutate({
      authToken: token || "",
      itemId,
      isCompleted: !currentStatus,
    });
  };

  const handleViewChecklist = (bookingId: number) => {
    setSelectedBookingChecklist(bookingId);
  };

  const handleCloseChecklist = () => {
    setSelectedBookingChecklist(undefined);
  };

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

  const handleCancelRequest = (requestId: number) => {
    if (confirm("Are you sure you want to cancel this request?")) {
      deleteTimeOffRequestMutation.mutate({
        authToken: token || "",
        requestId,
      });
    }
  };

  const handleEditRequest = (request: any) => {
    // Convert ISO date strings to YYYY-MM-DD format for date inputs
    const startDate = new Date(request.startDate).toISOString().split('T')[0];
    const endDate = new Date(request.endDate).toISOString().split('T')[0];

    setEditingRequest({
      id: request.id,
      startDate,
      endDate,
      reason: request.reason || "",
    });
  };

  const handleUpdateRequest = (data: { startDate: string; endDate: string; reason?: string }) => {
    if (!editingRequest) return;

    updateTimeOffRequestMutation.mutate({
      authToken: token || "",
      requestId: editingRequest.id,
      startDate: `${data.startDate}T12:00:00.000Z`,
      endDate: `${data.endDate}T12:00:00.000Z`,
      reason: data.reason,
    });
  };

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out successfully");
    navigate({ to: "/login" });
  };

  if (!token || !user) {
    return null;
  }

  return (
    <PortalLayout portalType="cleaner">
      <div className="bg-[#EAE9E3] min-h-screen">
        {/* Header Section */}
        <DashboardHeader subtitle="View your schedule and manage your assignments." />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Schedule Section */}
          {(view === "dashboard" || view === "schedule") && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">My Schedule</h2>
            </div>

            {scheduleQuery.isLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <p className="text-gray-600 font-medium">Loading your schedule...</p>
                </div>
              </div>
            ) : scheduleQuery.isError ? (
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-900 font-semibold text-lg mb-1">Error Loading Schedule</p>
                    <p className="text-red-700 text-sm">Please try refreshing the page</p>
                  </div>
                </div>
              </div>
            ) : scheduleQuery.data?.bookings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-lg mb-1">No Bookings Scheduled</p>
                    <p className="text-gray-600 text-sm">You don't have any cleaning appointments yet</p>
                  </div>
                </div>
              </div>
            ) : view === "schedule" ? (
              // Calendar view for schedule page
              <CleanerCalendarView
                bookings={scheduleQuery.data?.bookings || []}
                onViewChecklist={handleViewChecklist}
              />
            ) : (
              // Card view for dashboard
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {scheduleQuery.data?.bookings.map((booking) => {
                  const checklist = booking.checklist;
                  const completedItems = checklist?.items.filter(item => item.isCompleted).length || 0;
                  const totalItems = checklist?.items.length || 0;
                  const hasChecklist = checklist && totalItems > 0;

                  return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1" />
                        {hasChecklist && (
                          <button
                            onClick={() => handleViewChecklist(booking.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs font-semibold"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            {completedItems}/{totalItems}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-4 text-gray-900 font-heading group-hover:text-primary transition-colors">
                        {booking.serviceType}
                      </h3>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-500 text-xs mb-0.5">Date</p>
                            <p className="text-gray-900 font-medium">
                              {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-500 text-xs mb-0.5">Time</p>
                            <p className="text-gray-900 font-medium">{formatTime12Hour(booking.scheduledTime)}</p>
                          </div>
                        </div>

                        {booking.durationHours && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-500 text-xs mb-0.5">Duration</p>
                              <p className="text-gray-900 font-medium">{formatDurationHours(booking.durationHours)}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-500 text-xs mb-0.5">Location</p>
                            <p className="text-gray-900 font-medium line-clamp-2">{booking.address}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-500 text-xs mb-0.5">Client</p>
                              <p className="text-gray-900 font-medium">
                                {booking.client.firstName} {booking.client.lastName}
                              </p>
                              {booking.client.phone && (
                                <p className="text-gray-600 text-xs mt-1">
                                  📞 {formatPhoneNumber(booking.client.phone)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    {booking.specialInstructions && (
                      <div className="px-5 pb-5">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1.5">
                            Special Instructions
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {booking.specialInstructions}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </section>
          )}

          {/* Payments Section */}
          {view === "payments" && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">Payments</h2>
            </div>

            {paymentsQuery.isLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <p className="text-gray-600 font-medium">Loading payment information...</p>
                </div>
              </div>
            ) : paymentsQuery.isError ? (
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-900 font-semibold text-lg mb-1">Error Loading Payments</p>
                    <p className="text-red-700 text-sm">Please try refreshing the page</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Date Range Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Payment Period</h3>
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

                {/* Enhanced Payment Summary Cards */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                  <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-green-100 text-sm mb-2 font-medium">Total Earnings</p>
                    <p className="text-4xl font-bold">
                      ${paymentsQuery.data?.summary.totalEarnings.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 font-medium">Paid</p>
                    <p className="text-4xl font-bold text-green-600">
                      ${paymentsQuery.data?.summary.paidEarnings.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border-2 border-yellow-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Clock3 className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 font-medium">Pending</p>
                    <p className="text-4xl font-bold text-yellow-600">
                      ${paymentsQuery.data?.summary.pendingEarnings.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment History */}
                {paymentsQuery.data?.payments.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        <Wallet className="w-10 h-10 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold text-lg mb-1">No Payment History</p>
                        <p className="text-gray-600 text-sm">
                          {appliedStartDate || appliedEndDate
                            ? "No payments found for the selected period. Try clearing the filter to see all payments."
                            : "Your payment history will appear here once you complete jobs"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 font-heading">Payment History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Service
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentsQuery.data?.payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {new Date(payment.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">{payment.booking.serviceType}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(payment.booking.scheduledDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                ${payment.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                                    payment.paidAt
                                      ? "bg-green-100 text-green-800 border border-green-200"
                                      : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  }`}
                                >
                                  {payment.paidAt ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      Paid
                                    </>
                                  ) : (
                                    <>
                                      <Clock3 className="w-3 h-3" />
                                      Pending
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
          )}

          {/* Requests Section */}
          {view === "requests" && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CalendarOff className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">Schedule Change Requests</h2>
            </div>

            {/* Submit New Request Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit New Request</h3>
              <TimeOffRequestForm
                onSubmit={(data) => {
                  submitTimeOffRequestMutation.mutate({
                    authToken: token || "",
                    startDate: `${data.startDate}T12:00:00.000Z`,
                    endDate: `${data.endDate}T12:00:00.000Z`,
                    reason: data.reason,
                  });
                }}
                isSubmitting={submitTimeOffRequestMutation.isPending}
              />
            </div>

            {/* Existing Requests List */}
            {timeOffRequestsQuery.isLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <p className="text-gray-600 font-medium">Loading your requests...</p>
                </div>
              </div>
            ) : timeOffRequestsQuery.isError ? (
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-900 font-semibold text-lg mb-1">Error Loading Requests</p>
                    <p className="text-red-700 text-sm">Please try refreshing the page</p>
                  </div>
                </div>
              </div>
            ) : timeOffRequestsQuery.data?.requests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <CalendarOff className="w-10 h-10 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-lg mb-1">No Requests Yet</p>
                    <p className="text-gray-600 text-sm">Submit a request above to change your schedule or availability</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 font-heading">Your Requests</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {timeOffRequestsQuery.data?.requests.map((request) => (
                    <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                                request.status === "APPROVED"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : request.status === "REJECTED"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                              }`}
                            >
                              {request.status === "APPROVED" ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  Approved
                                </>
                              ) : request.status === "REJECTED" ? (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  Rejected
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </>
                              )}
                            </span>
                            <span className="text-xs text-gray-500">
                              Submitted {new Date(request.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(request.startDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                              {' → '}
                              {new Date(request.endDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {request.reason && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Reason:</span> {request.reason}
                              </p>
                            )}
                            {request.reviewedBy && (
                              <p className="text-xs text-gray-500 mt-2">
                                Reviewed by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                                {request.reviewedAt && (
                                  <> on {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}</>
                                )}
                              </p>
                            )}
                            {request.adminNotes && (
                              <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="font-medium">Admin Notes:</span> {request.adminNotes}
                              </p>
                            )}
                          </div>
                        </div>
                        {request.status === "PENDING" && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleEditRequest(request)}
                              className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          )}
        </div>
      </div>

      {/* Edit Request Modal */}
      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSubmit={handleUpdateRequest}
          isSubmitting={updateTimeOffRequestMutation.isPending}
        />
      )}

      {/* Checklist Modal */}
      {selectedBookingChecklist && (
        <ChecklistModal
          booking={scheduleQuery.data?.bookings.find(b => b.id === selectedBookingChecklist)}
          onClose={handleCloseChecklist}
          onToggleItem={handleToggleChecklistItem}
          isUpdating={updateChecklistItemMutation.isPending}
        />
      )}
    </PortalLayout>
  );
}

interface EditRequestModalProps {
  request: {
    id: number;
    startDate: string;
    endDate: string;
    reason?: string;
  };
  onClose: () => void;
  onSubmit: (data: { startDate: string; endDate: string; reason?: string }) => void;
  isSubmitting: boolean;
}

function EditRequestModal({ request, onClose, onSubmit, isSubmitting }: EditRequestModalProps) {
  // Define validation schema
  const editRequestSchema = z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().optional(),
  }).refine((data) => {
    // Validate that end date is after start date
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  }, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ startDate: string; endDate: string; reason?: string }>({
    resolver: zodResolver(editRequestSchema),
    defaultValues: {
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason || "",
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Edit Time-Off Request</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-startDate"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Start Date *
              </label>
              <input
                id="edit-startDate"
                type="date"
                {...register("startDate")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="edit-endDate"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                End Date *
              </label>
              <input
                id="edit-endDate"
                type="date"
                {...register("endDate")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="edit-reason"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Reason (Optional)
            </label>
            <textarea
              id="edit-reason"
              rows={3}
              {...register("reason")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Provide a reason for your time-off request..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Update Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ChecklistModalProps {
  booking: any;
  onClose: () => void;
  onToggleItem: (itemId: number, currentStatus: boolean) => void;
  isUpdating: boolean;
}

function ChecklistModal({ booking, onClose, onToggleItem, isUpdating }: ChecklistModalProps) {
  if (!booking || !booking.checklist) return null;

  const checklist = booking.checklist;
  const completedItems = checklist.items.filter((item: any) => item.isCompleted).length;
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{checklist.template.name}</h2>
              <p className="text-green-100 text-sm">{booking.serviceType}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="font-bold">{completedItems} / {totalItems} ({progress}%)</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="p-6">
          <div className="space-y-3">
            {checklist.items.map((item: any, index: number) => (
              <button
                key={item.id}
                onClick={() => onToggleItem(item.id, item.isCompleted)}
                disabled={isUpdating}
                className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  item.isCompleted
                    ? "bg-green-50 border-green-200 hover:bg-green-100"
                    : "bg-white border-gray-200 hover:bg-gray-50 hover:border-primary/30"
                } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {item.isCompleted ? (
                    <CheckSquare className="w-6 h-6 text-green-600" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        item.isCompleted
                          ? "text-green-900 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {item.description}
                    </p>
                    <span className="text-xs font-semibold text-gray-400 flex-shrink-0">
                      #{index + 1}
                    </span>
                  </div>
                  {item.isCompleted && item.completedAt && (
                    <p className="text-xs text-green-700 mt-1">
                      Completed {new Date(item.completedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
            >
              Close Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimeOffRequestFormProps {
  onSubmit: (data: { startDate: string; endDate: string; reason?: string }) => void;
  isSubmitting: boolean;
}

function TimeOffRequestForm({ onSubmit, isSubmitting }: TimeOffRequestFormProps) {
  // Define validation schema
  const timeOffRequestSchema = z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().optional(),
  }).refine((data) => {
    // Validate that end date is after start date
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  }, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ startDate: string; endDate: string; reason?: string }>({
    resolver: zodResolver(timeOffRequestSchema),
  });

  const handleFormSubmit = (data: { startDate: string; endDate: string; reason?: string }) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="startDate"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Start Date *
          </label>
          <input
            id="startDate"
            type="date"
            {...register("startDate")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="endDate"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            End Date *
          </label>
          <input
            id="endDate"
            type="date"
            {...register("endDate")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="reason"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Reason (Optional)
        </label>
        <textarea
          id="reason"
          rows={3}
          {...register("reason")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Provide a reason for your time-off request..."
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Request
          </>
        )}
      </button>
    </form>
  );
}
