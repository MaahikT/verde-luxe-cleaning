import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { PortalLayout } from "~/components/PortalLayout";
import { BookingTooltip } from "~/components/BookingTooltip";
import { SavedCardsPage } from "~/components/SavedCardsPage";
import { DashboardHeader } from "~/components/DashboardHeader";
import { Calendar, LogOut, Clock, MapPin, User, Package, CheckCircle, XCircle, Loader, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { formatTime12Hour, formatDurationHours } from "~/utils/formatTime";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

interface Booking {
  id: number;
  clientId: number;
  cleanerId: number | null;
  serviceType: string;
  scheduledDate: string | Date;
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
    color: string | null;
  } | null;
}

const clientPortalSearchSchema = z.object({
  view: z.enum(["dashboard", "bookings", "payment-methods"]).default("dashboard"),
});

export const Route = createFileRoute("/client-portal/")({
  component: ClientPortalPage,
  validateSearch: zodValidator(clientPortalSearchSchema),
});

function ClientPortalPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token, user, clearAuth } = useAuthStore();
  const { view } = Route.useSearch();
  // Map view to activeTab for backwards compatibility with existing UI
  const activeTab = view === "bookings" ? "all" : "upcoming";
  const queryClient = useQueryClient();

  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [tooltipTarget, setTooltipTarget] = useState<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);



  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (!token || !user) {
      toast.error("Please log in to access the client portal");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "CLIENT") {
      toast.error("Access denied. Client account required.");
      navigate({ to: "/" });
    }
  }, [token, user, navigate]);

  const upcomingQuery = useQuery(
    trpc.getUpcomingBookings.queryOptions({
      authToken: token || "",
    })
  );

  const allBookingsQuery = useQuery(
    trpc.getAllBookings.queryOptions({
      authToken: token || "",
    })
  );

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out successfully");
    navigate({ to: "/login" });
  };

  if (!token || !user) {
    return null;
  }

  const currentQuery = activeTab === "upcoming" ? upcomingQuery : allBookingsQuery;

  // Sync hoveredBooking with latest data when bookings update
  useEffect(() => {
    if (hoveredBooking && currentQuery.data?.bookings) {
      // Cast to any to avoid strict type mismatch if there are minor optional prop differences
      const freshBooking = currentQuery.data.bookings.find(b => b.id === hoveredBooking.id);

      // Only update if the object reference has changed (implies data update)
      if (freshBooking && freshBooking !== hoveredBooking) {
        setHoveredBooking(freshBooking as unknown as Booking);
      }
    }
  }, [currentQuery.data, hoveredBooking]);

  return (
    <PortalLayout portalType="client">
      <div className="bg-[#EAE9E3] min-h-screen">
        {/* Header Section */}
        <DashboardHeader subtitle="Track your bookings and manage your cleaning services." />

        {/* Main Content - Conditionally render based on view */}
        {view === "payment-methods" ? (
          <SavedCardsPage />
        ) : (
          <>
            {/* Existing bookings tabs and content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Enhanced Tabs */}
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                  <nav className="flex gap-1">
                    <button
                      onClick={() => navigate({ to: "/client-portal", search: { view: "dashboard" } })}
                      className={`flex-1 py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
                        activeTab === "upcoming"
                          ? "bg-primary text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Upcoming Bookings
                      </span>
                    </button>
                    <button
                      onClick={() => navigate({ to: "/client-portal", search: { view: "bookings" } })}
                      className={`flex-1 py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
                        activeTab === "all"
                          ? "bg-primary text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Package className="w-4 h-4" />
                        All Bookings
                      </span>
                    </button>
                  </nav>
                </div>
              </div>

              {/* Bookings Display */}
              {currentQuery.isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">Loading your bookings...</p>
                  </div>
                </div>
              ) : currentQuery.isError ? (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <p className="text-red-900 font-semibold text-lg mb-1">Error Loading Bookings</p>
                      <p className="text-red-700 text-sm">Please try refreshing the page</p>
                    </div>
                  </div>
                </div>
              ) : currentQuery.data?.bookings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-lg mb-1">
                        {activeTab === "upcoming" ? "No Upcoming Bookings" : "No Bookings Yet"}
                      </p>
                      <p className="text-gray-600 text-sm mb-4">
                        {activeTab === "upcoming"
                          ? "You don't have any upcoming cleaning appointments"
                          : "Start by booking your first cleaning service"}
                      </p>
                      <button
                        onClick={() => navigate({ to: "/book-now" })}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
                      >
                        <Calendar className="w-4 h-4" />
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {currentQuery.data?.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      onMouseEnter={(e) => {
                        // Clear any pending hide timeout
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        // Show immediately
                        setHoveredBooking(booking);
                        setTooltipTarget(e.currentTarget);
                      }}
                      onMouseLeave={() => {
                        // Delay hiding to prevent flicker
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        hoverTimeoutRef.current = window.setTimeout(() => {
                          setHoveredBooking(null);
                          setTooltipTarget(null);
                        }, 200);
                      }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden group"
                    >
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-600">
                          {booking.serviceType}
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

                          {booking.cleaner && (
                            <div className="pt-3 border-t border-gray-100">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-500 text-xs mb-0.5">Cleaner</p>
                                  <p className="text-gray-900 font-medium">
                                    {booking.cleaner.firstName} {booking.cleaner.lastName}
                                  </p>
                                  {booking.cleaner.phone && (
                                    <p className="text-gray-600 text-xs mt-1">
                                      📞 {formatPhoneNumber(booking.cleaner.phone)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {!booking.cleaner && (
                            <div className="pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 rounded-lg p-2.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="text-xs font-medium">Awaiting cleaner assignment</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      {(booking.finalPrice || booking.specialInstructions) && (
                        <div className="px-5 pb-5 space-y-3">
                          {booking.finalPrice && (
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
                              <p className="text-xs text-gray-600 mb-1">Price</p>
                              <p className="text-xl font-bold text-primary-dark">
                                ${booking.finalPrice.toFixed(2)}
                              </p>
                            </div>
                          )}

                          {booking.specialInstructions && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600 font-semibold mb-1.5">
                                Special Instructions
                              </p>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {booking.specialInstructions}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Booking Tooltip */}
        {hoveredBooking && tooltipTarget && (
          <BookingTooltip
            booking={hoveredBooking}
            targetElement={tooltipTarget}
            visible={true}
          />
        )}
      </div>
    </PortalLayout>
  );
}
