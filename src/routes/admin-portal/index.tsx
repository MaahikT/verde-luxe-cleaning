import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { PortalLayout } from "~/components/PortalLayout";
import { AdminCalendarView, type Booking } from "~/components/AdminCalendarView";
import { AdminBookingForm } from "~/components/AdminBookingForm";
import { AdminUserForm } from "~/components/AdminUserForm";
import { AdminChecklistManagement } from "~/components/AdminChecklistManagement";
import { AdminPricingManagement } from "~/components/AdminPricingManagement";
import { AdminBillingManagement } from "~/components/AdminBillingManagement";
import { AdminEmailAutomations } from "~/components/AdminEmailAutomations";
import { AdminReports } from "~/components/AdminReports";
import { AdminBookingChargesTabs } from "~/components/AdminBookingChargesTabs";
import { BankTransactionsContent } from "~/routes/admin-portal/bank-transactions/index";
import { MonthlyRevenueCard } from "~/components/MonthlyRevenueCard";
import { MonthlyBookingsCard } from "~/components/MonthlyBookingsCard";
import { RevenueOverviewCard } from "~/components/RevenueOverviewCard";
import { PendingChargesCard } from "~/components/PendingChargesCard";
import { UpcomingJobsCard } from "~/components/UpcomingJobsCard";
import { MiniPersonalCalendarCard } from "~/components/MiniPersonalCalendarCard";
import { BookingDetailsSidePanel } from "~/components/BookingDetailsSidePanel";
import { ProviderListFloating } from "~/components/ProviderListFloating";
import { DashboardHeader } from "~/components/DashboardHeader";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";
import {
  LogOut,
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  Package,
  UserCheck,
  Edit,
  Trash2,
  UserPlus,
  Eye,
  CheckSquare,
  X,
  CalendarOff,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

const adminPortalSearchSchema = z.object({
  view: z.enum([
    "dashboard",
    "leads",
    "bookings-calendar",
    "booking-charges",
    "bank-transactions",
    "customers", // Keep for backward compatibility
    "management-customers",
    "management-cleaners",
    "management-admins",
    "reports",
    "store-options-checklist",
    "store-options-pricing",
    "store-options-billing",
    "store-options-pricing",
    "store-options-billing",
    "cleaner-requests",
    "automations",
    "automations-email"
  ]).default("dashboard"),
  action: z.enum(["create-booking", "edit-booking"]).optional(),
  clientId: z.coerce.number().optional(),
  cleanerId: z.coerce.number().optional(),
  bookingId: z.coerce.number().optional(),
});

export const Route = createFileRoute("/admin-portal/")({
  component: AdminPortalPage,
  validateSearch: zodValidator(adminPortalSearchSchema),
});



interface BookingChecklistModalProps {
  checklist: any;
  booking: any;
  onClose: () => void;
  onToggleItem: (itemId: number, currentStatus: boolean) => void;
  isUpdating: boolean;
}

function BookingChecklistModal({ checklist, booking, onClose, onToggleItem, isUpdating }: BookingChecklistModalProps) {
  const completedItems = checklist.items.filter((item: any) => item.isCompleted).length;
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1002] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{checklist.template.name}</h2>
              <p className="text-green-100 text-sm">{checklist.template.serviceType}</p>
              {booking && (
                <p className="text-green-100 text-xs mt-1">
                  {booking.client.firstName} {booking.client.lastName} • {new Date(booking.scheduledDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
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
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-gray-400" />
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
                      ✓ Completed {new Date(item.completedAt).toLocaleString('en-US', {
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

interface PaymentHoldCancellationModalProps {
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

function PaymentHoldCancellationModal({
  onConfirm,
  onSkip,
  onCancel,
  isProcessing
}: PaymentHoldCancellationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1003] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cancel Payment Hold?</h2>
              <p className="text-sm text-gray-600 mt-1">
                This booking has an active payment hold
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              Would you like to release the payment hold (authorization) for this booking?
              This will cancel the pending charge on the customer's card.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Canceling Hold...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Yes, Cancel Payment Hold
                </>
              )}
            </button>

            <button
              onClick={onSkip}
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              No, Keep Payment Hold
            </button>

            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Operation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPortalPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user, clearAuth } = useAuthStore();
  const { view: activeView, action, clientId, cleanerId, bookingId } = Route.useSearch();
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Auto-open booking form if action is create-booking
  useEffect(() => {
    if (action === "create-booking") {
      setShowBookingForm(true);
    }
  }, [action]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>();
  const [showSidePanel, setShowSidePanel] = useState(false);



  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    color: string | null;
  } | undefined>();
  const [selectedBookingForChecklist, setSelectedBookingForChecklist] = useState<number | undefined>();
  const [isProviderListExpanded, setIsProviderListExpanded] = useState(true);
  const [showPaymentHoldModal, setShowPaymentHoldModal] = useState(false);
  const [pendingDeleteBookingId, setPendingDeleteBookingId] = useState<number | undefined>();
  const [pendingCancelBookingId, setPendingCancelBookingId] = useState<number | undefined>();

  // Redirect if not authenticated or not an admin/owner
  useEffect(() => {
    if (!token || !user) {
      toast.error("Please log in to access the admin portal");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      toast.error("Access denied. Admin privileges required.");
      navigate({ to: "/" });
    }
  }, [token, user, navigate]);

  const monthlyMetricsQuery = useQuery(
    trpc.getMonthlyDashboardMetrics.queryOptions({
      authToken: token || "",
    })
  );

  const bookingsQuery = useQuery(
    trpc.getAllBookingsAdmin.queryOptions({
      authToken: token || "",
    })
  );

  // Auto-select booking if bookingId param exists and bookings are loaded
  useEffect(() => {
    if (bookingId && bookingsQuery.data?.bookings) {
      const booking = bookingsQuery.data.bookings.find(b => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking as any);
        setShowSidePanel(true);
      }
    }
  }, [bookingId, bookingsQuery.data]);

  const usersQuery = useQuery(
    trpc.getAllUsersAdmin.queryOptions({
      authToken: token || "",
    })
  );

  const bookingChecklistQuery = useQuery({
    ...trpc.getBookingChecklist.queryOptions({
      authToken: token || "",
      bookingId: selectedBookingForChecklist || 0,
    }),
    enabled: !!selectedBookingForChecklist && !!token,
  });

  const timeOffRequestsQuery = useQuery(
    trpc.getAllTimeOffRequests.queryOptions({
      authToken: token || "",
    })
  );

  const createBookingMutation = useMutation(
    trpc.createBookingAdmin.mutationOptions({
      onSuccess: (data) => {
        if (data.generatedPassword) {
          // New client was created with temporary password
          toast.success(
            `Booking created! New client account created.\n\nTemporary Password: ${data.generatedPassword}\n\nPlease share this with the client. They can change it via "Forgot Password".`,
            {
              duration: 15000, // Show for 15 seconds
              style: {
                maxWidth: '500px',
                whiteSpace: 'pre-line',
              },
            }
          );
        } else {
          toast.success("Booking created successfully!");
        }
        handleCloseBookingForm();
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllUsersAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create booking");
      },
    })
  );

  const updateBookingMutation = useMutation(
    trpc.updateBookingAdmin.mutationOptions({
      onSuccess: (data, variables) => {
        // Check if status was changed to CANCELLED and there's a payment hold
        if (variables.status === "CANCELLED" && selectedBooking) {
          const hasPaymentHold = selectedBooking.paymentMethod === "CREDIT_CARD" &&
                                 (selectedBooking.status === "PENDING" || selectedBooking.status === "CONFIRMED");

          if (hasPaymentHold) {
            // Show modal to ask about canceling payment hold
            setPendingCancelBookingId(selectedBooking.id);
            setShowPaymentHoldModal(true);
            // Close the form immediately
            setShowBookingForm(false);
            setShowSidePanel(false);
            // Keep selectedBooking for the modal handlers
            return;
          }
        }

        toast.success("Booking updated successfully!");
        setShowBookingForm(false);
        setShowSidePanel(false);
        setSelectedBooking(undefined);
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update booking");
      },
    })
  );

  const deleteBookingMutation = useMutation(
    trpc.deleteBookingAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Booking deleted successfully!");
        setShowBookingForm(false);
        setShowSidePanel(false);
        setSelectedBooking(undefined);
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete booking");
      },
    })
  );

  const createUserMutation = useMutation(
    trpc.createUserAdmin.mutationOptions({
      onSuccess: (data) => {
        if (data.generatedPassword) {
          // New client was created with temporary password
          toast.success(
            `User created! Temporary password generated.\n\nTemporary Password: ${data.generatedPassword}\n\nPlease share this with the client. They can change it via "Forgot Password".`,
            {
              duration: 15000, // Show for 15 seconds
              style: {
                maxWidth: '500px',
                whiteSpace: 'pre-line',
              },
            }
          );
        } else {
          toast.success("User created successfully!");
        }
        setShowUserForm(false);
        setSelectedUser(undefined);
        queryClient.invalidateQueries({ queryKey: trpc.getAllUsersAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create user");
      },
    })
  );

  const updateUserMutation = useMutation(
    trpc.updateUserAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("User updated successfully!");
        setShowUserForm(false);
        setSelectedUser(undefined);
        // Invalidate users query to update the provider list
        queryClient.invalidateQueries({ queryKey: trpc.getAllUsersAdmin.queryKey() });
        // Invalidate bookings query to refresh calendar with new color assignments
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update user");
      },
    })
  );

  const deleteUserMutation = useMutation(
    trpc.deleteUserAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("User deleted successfully!");
        // Invalidate all related queries since deleting a user affects bookings
        queryClient.invalidateQueries({ queryKey: trpc.getAllUsersAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete user");
      },
    })
  );

  const updateChecklistItemMutation = useMutation(
    trpc.updateBookingChecklistItem.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist updated!");
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getBookingChecklist.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update checklist");
      },
    })
  );

  const updateTimeOffRequestMutation = useMutation(
    trpc.updateTimeOffRequestStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Request status updated successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getAllTimeOffRequests.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update request status");
      },
    })
  );

  const clearTimeOffRequestMutation = useMutation(
    trpc.clearTimeOffRequestAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Request cleared from dashboard!");
        queryClient.invalidateQueries({ queryKey: trpc.getAllTimeOffRequests.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to clear request");
      },
    })
  );

  const cancelPaymentHoldMutation = useMutation(
    trpc.cancelPaymentHold.mutationOptions({
      onSuccess: () => {
        toast.success("Payment hold canceled successfully!");
      },
      onError: (error) => {
        // Don't show error toast here - we'll handle it in the flow
        console.error("Failed to cancel payment hold:", error);
      },
    })
  );

  const createLeadMutation = useMutation(
    trpc.createLeadFromBooking.mutationOptions({
      onSuccess: () => {
        toast.success("Lead saved successfully!");
        setShowBookingForm(false);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: trpc.getAllLeadsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save lead");
      },
    })
  );

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out successfully");
    navigate({ to: "/login" });
  };

  const handleCloseBookingForm = () => {
    setShowBookingForm(false);
    setSelectedBooking(undefined);
    navigate({
      search: (prev: any) => {
         const { action, clientId, cleanerId, bookingId, ...rest } = prev;
         return { ...rest, view: activeView || "dashboard" };
      },
      replace: true,
    });
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowSidePanel(true);
  };

  const handleEditFromSidePanel = () => {
    setShowSidePanel(false);
    setShowBookingForm(true);
  };

  const handleCreateBooking = () => {
    setSelectedBooking(undefined);
    setShowBookingForm(true);
  };

  const handleBookingFormSubmit = (data: any) => {
    // Fix date handling: append time to ensure it stays on the correct day regardless of timezone
    // By appending T12:00:00.000Z, we ensure the date is interpreted as noon UTC, avoiding off-by-one errors
    const scheduledDate = `${data.scheduledDate}T12:00:00.000Z`;

    if (selectedBooking) {
      // Update existing booking
      updateBookingMutation.mutate({
        authToken: token || "",
        bookingId: selectedBooking.id,
        ...data,
        scheduledDate,
        overrideConflict: data.overrideConflict || false,
      });
    } else {
      // Create new booking
      createBookingMutation.mutate({
        authToken: token || "",
        ...data,
        scheduledDate,
        overrideConflict: data.overrideConflict || false,
      });
    }
  };

  const handleSaveAsLeadFromCalendar = (data: any) => {
    // Fix date handling: append time to ensure it stays on the correct day regardless of timezone
    const scheduledDate = data.scheduledDate ? `${data.scheduledDate}T12:00:00.000Z` : undefined;

    createLeadMutation.mutate({
      authToken: token || "",
      ...data,
      scheduledDate,
    });
  };

  const handleDeleteBooking = async (bookingId: number, clientName: string) => {
    if (window.confirm(`Are you sure you want to delete the booking for ${clientName}? This action cannot be undone.`)) {
      // Check if this booking has a payment hold
      const booking = bookingsQuery.data?.bookings.find(b => b.id === bookingId);
      const hasPaymentHold = booking?.paymentMethod === "CREDIT_CARD" &&
                             (booking?.status === "PENDING" || booking?.status === "CONFIRMED");

      if (hasPaymentHold) {
        // Show modal to ask about canceling payment hold
        setPendingDeleteBookingId(bookingId);
        setShowPaymentHoldModal(true);
      } else {
        // No payment hold, proceed with deletion
        deleteBookingMutation.mutate({
          authToken: token || "",
          bookingId,
        });
      }
    }
  };

  const handleConfirmCancelPaymentHold = async () => {
    const bookingId = pendingDeleteBookingId || pendingCancelBookingId;
    if (!bookingId) return;

    try {
      // Cancel the payment hold first
      await cancelPaymentHoldMutation.mutateAsync({
        authToken: token || "",
        bookingId,
      });

      // Then proceed with the original action
      if (pendingDeleteBookingId) {
        deleteBookingMutation.mutate({
          authToken: token || "",
          bookingId: pendingDeleteBookingId,
        });
      } else if (pendingCancelBookingId) {
        // For cancel booking, the booking is already updated to CANCELLED
        // Just show success and invalidate queries
        toast.success("Booking canceled and payment hold released successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
        setSelectedBooking(undefined);
      }

      // Close modal and reset state
      setShowPaymentHoldModal(false);
      setPendingDeleteBookingId(undefined);
      setPendingCancelBookingId(undefined);
    } catch (error) {
      toast.error("Failed to cancel payment hold. Please try again.");
    }
  };

  const handleSkipCancelPaymentHold = () => {
    // Proceed without canceling payment hold
    if (pendingDeleteBookingId) {
      deleteBookingMutation.mutate({
        authToken: token || "",
        bookingId: pendingDeleteBookingId,
      });
    } else if (pendingCancelBookingId) {
      // For cancel booking, the booking is already updated to CANCELLED
      // Just show success and invalidate queries
      toast.success("Booking canceled successfully! Payment hold was not released.");
      queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
      setSelectedBooking(undefined);
    }

    // Close modal and reset state
    setShowPaymentHoldModal(false);
    setPendingDeleteBookingId(undefined);
    setPendingCancelBookingId(undefined);
  };

  const handleCancelPaymentHoldOperation = () => {
    // Cancel the entire operation
    setShowPaymentHoldModal(false);
    setPendingDeleteBookingId(undefined);
    setPendingCancelBookingId(undefined);
  };

  const handleCreateUser = () => {
    setSelectedUser(undefined);
    setShowUserForm(true);
  };

  const handleEditUser = (user: {
    id: number;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    color: string | null;
  }) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate({
        authToken: token || "",
        userId,
      });
    }
  };

  const handleUserFormSubmit = (data: any) => {
    if (selectedUser) {
      // Update existing user
      const updateData: any = {
        authToken: token || "",
        userId: selectedUser.id,
        email: data.email,
        role: data.role,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phone: data.phone || undefined,
        color: data.color === "" ? null : (data.color || null),
        adminPermissions: data.adminPermissions,
      };

      // Only include password if it's not empty
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      // Include temporaryPassword if it's provided (even if empty string to clear it)
      if (data.temporaryPassword !== undefined) {
        updateData.temporaryPassword = data.temporaryPassword;
      }

      updateUserMutation.mutate(updateData);
    } else {
      // Create new user
      createUserMutation.mutate({
        authToken: token || "",
        email: data.email,
        password: data.password,
        role: data.role,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phone: data.phone || undefined,
        color: data.color === "" ? null : (data.color || null),
        adminPermissions: data.adminPermissions,
      });
    }
  };

  const handleViewCustomer = (userId: number) => {
    navigate({ to: "/admin-portal/customers/$userId", params: { userId: userId.toString() } });
  };

  const handleViewCleaner = (userId: number) => {
    navigate({ to: "/admin-portal/cleaners/$userId", params: { userId: userId.toString() } });
  };

  const handleViewBookingChecklist = (bookingId: number) => {
    setSelectedBookingForChecklist(bookingId);
  };

  const handleCloseBookingChecklist = () => {
    setSelectedBookingForChecklist(undefined);
  };

  const handleToggleChecklistItem = (itemId: number, currentStatus: boolean) => {
    updateChecklistItemMutation.mutate({
      authToken: token || "",
      itemId,
      isCompleted: !currentStatus,
    });
  };

  const handleApproveRequest = (requestId: number, cleanerName: string) => {
    const notes = window.prompt(`Approve time-off request for ${cleanerName}?\n\nOptional admin notes:`);
    if (notes !== null) {
      updateTimeOffRequestMutation.mutate({
        authToken: token || "",
        requestId,
        status: "APPROVED",
        adminNotes: notes || undefined,
      });
    }
  };

  const handleRejectRequest = (requestId: number, cleanerName: string) => {
    const notes = window.prompt(`Reject time-off request for ${cleanerName}?\n\nOptional admin notes (will be visible to cleaner):`);
    if (notes !== null) {
      updateTimeOffRequestMutation.mutate({
        authToken: token || "",
        requestId,
        status: "REJECTED",
        adminNotes: notes || undefined,
      });
    }
  };

  const handleClearRequest = (requestId: number, cleanerName: string) => {
    if (confirm(`Clear this time-off request from ${cleanerName} from your dashboard?\n\nNote: The approval status will remain unchanged. This only removes it from your view.`)) {
      clearTimeOffRequestMutation.mutate({
        authToken: token || "",
        requestId,
      });
    }
  };

  const handleToggleProviderList = () => {
    setIsProviderListExpanded((prev) => !prev);
  };

  if (!token || !user) {
    return null;
  }

  const clients = usersQuery.data?.users.filter((u) => u.role === "CLIENT") || [];
  const cleaners = usersQuery.data?.users.filter((u) => u.role === "CLEANER") || [];

  return (
    <PortalLayout portalType="admin">
      <div className="bg-[#EAE9E3] min-h-screen">
        {/* Header Section */}
        <DashboardHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Dashboard View */}
          {activeView === "dashboard" && (
            <div className="space-y-4">
              {/* Monthly Summary Cards */}
              {monthlyMetricsQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading dashboard...</p>
                  </div>
                </div>
              ) : monthlyMetricsQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading dashboard</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Row - Monthly Summary Cards */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MonthlyRevenueCard
                      current={monthlyMetricsQuery.data?.monthlyRevenue.current || 0}
                      previous={monthlyMetricsQuery.data?.monthlyRevenue.previous || 0}
                      changePercent={monthlyMetricsQuery.data?.monthlyRevenue.changePercent || 0}
                    />
                    <MonthlyBookingsCard
                      current={monthlyMetricsQuery.data?.monthlyBookings.current || 0}
                      previous={monthlyMetricsQuery.data?.monthlyBookings.previous || 0}
                      changePercent={monthlyMetricsQuery.data?.monthlyBookings.changePercent || 0}
                    />
                  </div>

                  {/* Main 3-Column Layout - Revenue Overview, Pending/Upcoming (stacked), Calendar */}
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Column 1: Revenue Overview */}
                    <RevenueOverviewCard data={monthlyMetricsQuery.data?.revenueTrends || []} />

                    {/* Column 2: Pending Charges + Upcoming Jobs (stacked) */}
                    <div className="space-y-4">
                      <PendingChargesCard />
                      <UpcomingJobsCard
                        jobs={monthlyMetricsQuery.data?.upcomingJobs || []}
                        onJobClick={handleBookingClick}
                      />
                    </div>

                    {/* Column 3: Personal Calendar */}
                    <MiniPersonalCalendarCard />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Leads View - Redirect to dedicated page */}
          {activeView === "leads" && (
            <>
              {(() => {
                navigate({ to: "/admin-portal/leads" });
                return null;
              })()}
            </>
          )}

          {/* Calendar View */}
          {activeView === "bookings-calendar" && (
            <div className="relative h-[calc(100vh-7rem)]">
              {bookingsQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading calendar...</p>
                  </div>
                </div>
              ) : bookingsQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading bookings</p>
                  </div>
                </div>
              ) : (
                <>
                  <AdminCalendarView
                    bookings={bookingsQuery.data?.bookings || []}
                    onBookingClick={handleBookingClick}
                    onCreateBooking={handleCreateBooking}
                    onViewChecklist={handleViewBookingChecklist}
                  />
                  <ProviderListFloating
                    providers={usersQuery.data?.users.filter(u => u.role === 'CLEANER') || []}
                    isExpanded={isProviderListExpanded}
                    onToggle={handleToggleProviderList}
                    isLoading={usersQuery.isLoading}
                  />
                </>
              )}
            </div>
          )}

          {/* Booking Charges View */}
          {activeView === "booking-charges" && (
            <AdminBookingChargesTabs />
          )}

          {/* Bank Transactions View */}
          {activeView === "bank-transactions" && (
            <BankTransactionsContent />
          )}

          {/* Customers View */}
          {activeView === "customers" && (
            <div className="space-y-6">
              {/* Create User Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  Create User
                </button>
              </div>

              {usersQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading customers...</p>
                  </div>
                </div>
              ) : usersQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading customers</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Clients Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Clients ({clients.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Joined
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {clients.map((client) => (
                            <tr key={client.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {client.firstName} {client.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {client.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {client.phone ? formatPhoneNumber(client.phone) : "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {new Date(client.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewCustomer(client.id)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditUser(client)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(client.id, `${client.firstName} ${client.lastName}`)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete user"
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

                  {/* Cleaners Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cleaners ({cleaners.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Joined
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {cleaners.map((cleaner) => (
                            <tr key={cleaner.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cleaner.firstName} {cleaner.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {cleaner.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {cleaner.phone ? formatPhoneNumber(cleaner.phone) : "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {new Date(cleaner.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewCleaner(cleaner.id)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditUser(cleaner)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(cleaner.id, `${cleaner.firstName} ${cleaner.lastName}`)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete user"
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
                </>
              )}
            </div>
          )}

          {/* Management - Customers View */}
          {activeView === "management-customers" && (
            <div className="space-y-6">
              {/* Create User Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  Create Customer
                </button>
              </div>

              {usersQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading customers...</p>
                  </div>
                </div>
              ) : usersQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading customers</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Customers ({clients.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {client.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {client.phone ? formatPhoneNumber(client.phone) : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(client.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewCustomer(client.id)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditUser(client)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(client.id, `${client.firstName} ${client.lastName}`)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete user"
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
            </div>
          )}

          {/* Management - Cleaners View */}
          {activeView === "management-cleaners" && (
            <div className="space-y-6">
              {/* Create User Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  Create Cleaner
                </button>
              </div>

              {usersQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading cleaners...</p>
                  </div>
                </div>
              ) : usersQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading cleaners</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Cleaners ({cleaners.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cleaners.map((cleaner) => (
                          <tr key={cleaner.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {cleaner.firstName} {cleaner.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {cleaner.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {cleaner.phone ? formatPhoneNumber(cleaner.phone) : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(cleaner.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewCleaner(cleaner.id)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditUser(cleaner)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(cleaner.id, `${cleaner.firstName} ${cleaner.lastName}`)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete user"
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
            </div>
          )}

          {/* Management - Admins View */}
          {activeView === "management-admins" && (
            <div className="space-y-6">
              {/* Create User Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  Create Admin
                </button>
              </div>

              {usersQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading admins...</p>
                  </div>
                </div>
              ) : usersQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading admins</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Admins & Owners ({usersQuery.data?.users.filter((u) => u.role === "ADMIN" || u.role === "OWNER").length || 0})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Permissions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usersQuery.data?.users.filter((u) => u.role === "ADMIN" || u.role === "OWNER").map((admin) => {
                          const permissions = admin.adminPermissions as Record<string, boolean> | null;
                          const permissionCount = permissions ? Object.values(permissions).filter(Boolean).length : 0;
                          const totalPermissions = 9; // Total number of available permissions

                          return (
                            <tr key={admin.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {admin.firstName} {admin.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {admin.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    admin.role === "OWNER"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {admin.role === "OWNER" ? "👑 Owner" : "Admin"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {admin.role === "OWNER" ? (
                                  <span className="text-green-600 font-medium">All Permissions</span>
                                ) : (
                                  <span>
                                    {permissionCount} / {totalPermissions}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditUser(admin)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit admin"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  {admin.role !== "OWNER" && (
                                    <button
                                      onClick={() => handleDeleteUser(admin.id, `${admin.firstName} ${admin.lastName}`)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete admin"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports View */}
          {activeView === "reports" && (
            <AdminReports />
          )}

          {/* Store Options - Checklist View */}
          {activeView === "store-options-checklist" && (
            <AdminChecklistManagement />
          )}

          {/* Store Options - Pricing View */}
          {activeView === "store-options-pricing" && (
            <AdminPricingManagement />
          )}

          {/* Store Options - Billing View */}
          {activeView === "store-options-billing" && (
            <AdminBillingManagement />
          )}

          {/* Cleaner Requests View */}
          {activeView === "cleaner-requests" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CalendarOff className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Schedule Change Requests</h2>
              </div>

              {timeOffRequestsQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading requests...</p>
                  </div>
                </div>
              ) : timeOffRequestsQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                    <p className="text-red-900 font-semibold">Error loading requests</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid gap-6 sm:grid-cols-3 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">Pending Requests</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {timeOffRequestsQuery.data?.requests.filter(r => r.status === "PENDING").length || 0}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">Approved</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {timeOffRequestsQuery.data?.requests.filter(r => r.status === "APPROVED").length || 0}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">Rejected</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {timeOffRequestsQuery.data?.requests.filter(r => r.status === "REJECTED").length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Requests List */}
                  {timeOffRequestsQuery.data?.requests.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                          <CalendarOff className="w-10 h-10 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-900 font-semibold text-lg mb-1">No Requests Yet</p>
                          <p className="text-gray-600 text-sm">Time-off requests from cleaners will appear here</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 font-heading">All Requests</h3>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {timeOffRequestsQuery.data?.requests.map((request) => (
                          <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
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
                                        Pending Review
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
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <p className="text-sm font-semibold text-gray-900">
                                      {request.cleaner.firstName} {request.cleaner.lastName}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <p className="text-sm text-gray-900">
                                      {new Date(request.startDate).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        timeZone: 'UTC'
                                      })}
                                      {' → '}
                                      {new Date(request.endDate).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        timeZone: 'UTC'
                                      })}
                                    </p>
                                  </div>
                                  {request.reason && (
                                    <div className="flex items-start gap-2 mt-2">
                                      <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Reason:</span> {request.reason}
                                      </p>
                                    </div>
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
                              {request.status === "PENDING" ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleApproveRequest(request.id, `${request.cleaner.firstName} ${request.cleaner.lastName}`)}
                                    disabled={updateTimeOffRequestMutation.isPending}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Approve request"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(request.id, `${request.cleaner.firstName} ${request.cleaner.lastName}`)}
                                    disabled={updateTimeOffRequestMutation.isPending}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Reject request"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleClearRequest(request.id, `${request.cleaner.firstName} ${request.cleaner.lastName}`)}
                                  disabled={clearTimeOffRequestMutation.isPending}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Clear from dashboard"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Automations - Email View */}
          {activeView === "automations-email" && (
            <AdminEmailAutomations />
          )}

        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <AdminBookingForm
          clients={clients}
          cleaners={cleaners}
          booking={selectedBooking}
          initialClientId={clientId}
          initialCleanerId={cleanerId}
          onSubmit={handleBookingFormSubmit}
          onSaveAsLead={!selectedBooking ? handleSaveAsLeadFromCalendar : undefined}
          onCancel={handleCloseBookingForm}
          onDelete={selectedBooking ? handleDeleteBooking : undefined}
          isSubmitting={
            createBookingMutation.isPending || updateBookingMutation.isPending || createLeadMutation.isPending
          }
          isDeleting={deleteBookingMutation.isPending}
        />
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <AdminUserForm
          user={selectedUser}
          onSubmit={handleUserFormSubmit}
          onCancel={() => {
            setShowUserForm(false);
            setSelectedUser(undefined);
          }}
          isSubmitting={
            createUserMutation.isPending || updateUserMutation.isPending
          }
        />
      )}

      {/* Booking Checklist Modal */}
      {selectedBookingForChecklist && bookingChecklistQuery.data?.checklist && (
        <BookingChecklistModal
          checklist={bookingChecklistQuery.data.checklist}
          booking={bookingsQuery.data?.bookings.find(b => b.id === selectedBookingForChecklist)}
          onClose={handleCloseBookingChecklist}
          onToggleItem={handleToggleChecklistItem}
          isUpdating={updateChecklistItemMutation.isPending}
        />
      )}

      {/* Booking Details Side Panel */}
      {showSidePanel && selectedBooking && (
        <BookingDetailsSidePanel
          booking={selectedBooking}
          onClose={() => {
            setShowSidePanel(false);
            setSelectedBooking(undefined);
            // Clear bookingId from URL if present
            if (bookingId) {
              navigate({
                search: (prev: any) => {
                  const { bookingId, ...rest } = prev;
                  return rest;
                },
                replace: true
              });
            }
          }}
          onEdit={handleEditFromSidePanel}
        />
      )}

      {/* Payment Hold Cancellation Modal */}
      {showPaymentHoldModal && (
        <PaymentHoldCancellationModal
          onConfirm={handleConfirmCancelPaymentHold}
          onSkip={handleSkipCancelPaymentHold}
          onCancel={handleCancelPaymentHoldOperation}
          isProcessing={cancelPaymentHoldMutation.isPending}
        />
      )}

    </PortalLayout>
  );
}
