import { X, User, Mail, Phone, Calendar, DollarSign, Package, CheckCircle, XCircle, Clock, MapPin, Briefcase } from "lucide-react";
import { AdminCalendarView } from "~/components/AdminCalendarView";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

interface CustomerDetails {
  id: number;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  temporaryPassword: string | null;
  hasResetPassword: boolean;
}

interface BookingClient {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

interface BookingCleaner {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

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
  client: BookingClient;
  cleaner: BookingCleaner | null;
}

interface Statistics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  totalEarned: number;
}

interface AdminCustomerDetailsProps {
  customer: CustomerDetails;
  clientBookings: Booking[];
  cleanerBookings: Booking[];
  statistics: Statistics;
  onClose: () => void;
  onBookingClick?: (booking: Booking) => void;
}

export function AdminCustomerDetails({
  customer,
  clientBookings,
  cleanerBookings,
  statistics,
  onClose,
  onBookingClick,
}: AdminCustomerDetailsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  // Combine all bookings for the calendar view
  const allBookings = [...clientBookings, ...cleanerBookings];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {customer.firstName} {customer.lastName}
                </h2>
                <p className="text-green-100 text-sm mt-1">{customer.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
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
                  <p className="font-medium text-gray-900">{customer.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">
                    {customer.phone ? formatPhoneNumber(customer.phone) : "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <div className="mt-1">{getRoleBadge(customer.role)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Temporary Password Section */}
            {customer.temporaryPassword && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-yellow-600 mt-0.5">🔑</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Temporary Password (Admin View Only)
                    </p>
                    <p className="font-mono text-lg font-bold text-yellow-900 bg-yellow-100 px-3 py-2 rounded border border-yellow-300 inline-block">
                      {customer.temporaryPassword}
                    </p>
                    <p className="text-xs text-yellow-700 mt-2">
                      {customer.hasResetPassword
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
                {statistics.totalBookings}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.completedBookings}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-gray-600">Cancelled</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.cancelledBookings}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">Total Spent</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${statistics.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Total Earned</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${statistics.totalEarned.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Calendar View for All Bookings */}
          {allBookings.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Bookings Calendar ({allBookings.length})
                </h3>
              </div>
              <div className="p-4">
                <AdminCalendarView
                  bookings={allBookings}
                  onBookingClick={onBookingClick || (() => {})}
                  onCreateBooking={() => {}}
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

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
