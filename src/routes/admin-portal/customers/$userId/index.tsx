import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { PortalLayout } from "~/components/PortalLayout";
import { AdminCalendarView } from "~/components/AdminCalendarView";
import { AdminSavedCardsSection } from "~/components/AdminSavedCardsSection";
import {
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  Briefcase,
  ArrowLeft,
  Loader,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

export const Route = createFileRoute("/admin-portal/customers/$userId/")({
  component: CustomerProfilePage,
});

import { BookingDetailsSidePanel } from "~/components/BookingDetailsSidePanel";
import { AdminBookingForm } from "~/components/AdminBookingForm";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";

function CustomerProfilePage() {
  const navigate = useNavigate();
  const { userId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  const customerDetailsQuery = useQuery({
    ...trpc.getCustomerDetailsAdmin.queryOptions({
      authToken: token || "",
      userId: parseInt(userId),
    }),
    enabled: !!token && !!userId,
  });

  const usersQuery = useQuery(
    trpc.getAllUsersAdmin.queryOptions({
      authToken: token || "",
    })
  );

  const clients = usersQuery.data?.users.filter((u) => u.role === "CLIENT") || [];
  const cleaners = usersQuery.data?.users.filter((u) => u.role === "CLEANER") || [];

  const updateBookingMutation = useMutation(
    trpc.updateBookingAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Booking updated successfully!");
        setIsEditing(false);
        setShowSidePanel(false);
        // Refresh data
        queryClient.invalidateQueries({ queryKey: trpc.getCustomerDetailsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
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
        setIsEditing(false);
        setShowSidePanel(false);
        setSelectedBooking(null);
        // Refresh data
        queryClient.invalidateQueries({ queryKey: trpc.getCustomerDetailsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete booking");
      },
    })
  );

  if (!token || !user) {
    return null;
  }

  const formatDate = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "CLIENT":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Client
          </span>
        );
      case "CLEANER":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            Cleaner
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
            Admin
          </span>
        );
      case "OWNER":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
            Owner
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {role}
          </span>
        );
    }
  };

  return (
    <PortalLayout portalType="admin">
      <div className="bg-[#EAE9E3] min-h-screen">
        {customerDetailsQuery.isLoading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Loader className="w-12 h-12 text-primary animate-spin" />
                <p className="text-gray-600 font-medium">Loading customer details...</p>
              </div>
            </div>
          </div>
        ) : customerDetailsQuery.isError ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <XCircle className="w-12 h-12 text-red-600" />
                <p className="text-red-900 font-semibold">Error loading customer details</p>
                <button
                  onClick={() => navigate({ to: "/admin-portal", search: { view: "management-customers" } })}
                  className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Back to Customers
                </button>
              </div>
            </div>
          </div>
        ) : customerDetailsQuery.data ? (
          <>
            {/* Header Section */}
            <div className="bg-[#EAE9E3]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                  onClick={() => navigate({ to: "/admin-portal", search: { view: "management-customers" } })}
                  className="flex items-center gap-2 text-gray-900 hover:text-primary transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Back to Customers</span>
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-gray-300">
                    <User className="w-8 h-8 text-gray-900" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold font-heading text-gray-900">
                      {customerDetailsQuery.data.customer.firstName} {customerDetailsQuery.data.customer.lastName}
                    </h1>
                    <p className="mt-2 text-gray-700 text-base">
                      {customerDetailsQuery.data.customer.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              {/* Customer Information Section */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{customerDetailsQuery.data.customer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">
                        {customerDetailsQuery.data.customer.phone ? formatPhoneNumber(customerDetailsQuery.data.customer.phone) : "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <div className="mt-1">{getRoleBadge(customerDetailsQuery.data.customer.role)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(customerDetailsQuery.data.customer.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Temporary Password Section */}
                {customerDetailsQuery.data.customer.temporaryPassword && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 text-yellow-600 mt-0.5">🔑</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-900 mb-1">
                          Temporary Password (Admin View Only)
                        </p>
                        <p className="font-mono text-lg font-bold text-yellow-900 bg-yellow-100 px-3 py-2 rounded border border-yellow-300 inline-block">
                          {customerDetailsQuery.data.customer.temporaryPassword}
                        </p>
                        <p className="text-xs text-yellow-700 mt-2">
                          {customerDetailsQuery.data.customer.hasResetPassword
                            ? "This temporary password can still be used if the customer forgets their current password. They can use it via 'Forgot Password' on the login page."
                            : "This password was auto-generated when the account was created. The customer can change it via 'Forgot Password' on the login page."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistics Section */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-gray-600">Total Bookings</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {customerDetailsQuery.data.statistics.totalBookings}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {customerDetailsQuery.data.statistics.completedBookings}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-gray-600">Cancelled</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {customerDetailsQuery.data.statistics.cancelledBookings}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-gray-600">Total Spent</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${customerDetailsQuery.data.statistics.totalSpent.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Total Earned</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${customerDetailsQuery.data.statistics.totalEarned.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Saved Payment Methods Section */}
              <AdminSavedCardsSection userId={parseInt(userId)} />

              {/* Calendar View for All Bookings */}
              {[...customerDetailsQuery.data.clientBookings, ...customerDetailsQuery.data.cleanerBookings].length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Bookings Calendar ({[...customerDetailsQuery.data.clientBookings, ...customerDetailsQuery.data.cleanerBookings].length})
                    </h3>
                  </div>
                  <div className="p-4">
                    <AdminCalendarView
                      bookings={[...customerDetailsQuery.data.clientBookings, ...customerDetailsQuery.data.cleanerBookings]}
                      onBookingClick={(booking) => {
                        setSelectedBooking(booking as any);
                        setShowSidePanel(true);
                      }}
                      onCreateBooking={() => {
                        // Navigate to main admin portal to create booking
                        navigate({
                          to: "/admin-portal",
                          search: {
                            view: "bookings-calendar",
                            action: "create-booking",
                            clientId: parseInt(userId)
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">No bookings found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    This customer hasn't made or been assigned to any bookings yet.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Booking Details Side Panel */}
      {showSidePanel && selectedBooking && !isEditing && (
        <BookingDetailsSidePanel
          booking={selectedBooking}
          onClose={() => {
            setShowSidePanel(false);
            setSelectedBooking(null);
          }}
          onEdit={() => {
            setIsEditing(true);
            setShowSidePanel(false);
          }}
        />
      )}

      {/* Inline Booking Edit Form */}
      {isEditing && selectedBooking && (
        <AdminBookingForm
          clients={clients}
          cleaners={cleaners}
          booking={selectedBooking}
          initialClientId={selectedBooking.clientId}
          initialCleanerId={selectedBooking.cleanerId}
          onSubmit={(data) => {
             updateBookingMutation.mutate({
               bookingId: selectedBooking.id,
               authToken: token || "",
               ...(data as any),
             });
          }}
          onCancel={() => {
            setIsEditing(false);
            setShowSidePanel(true);
          }}
          onDelete={(bookingId, clientName) => {
            if (window.confirm(`Are you sure you want to delete the booking for ${clientName}?`)) {
              deleteBookingMutation.mutate({ bookingId: bookingId, authToken: token || "" });
            }
          }}
          isSubmitting={updateBookingMutation.isPending}
          isDeleting={deleteBookingMutation.isPending}
        />
      )}
    </PortalLayout>
  );
}
