import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { formatTime12Hour, formatDurationHours } from "~/utils/formatTime";

interface BookingCalendarPickerProps {
  value: string; // Date string in YYYY-MM-DD format
  onChange: (date: string) => void;
  error?: string;
}

interface CleanerDetails {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

interface BookingAvailability {
  id: number;
  scheduledDate: Date;
  scheduledTime: string;
  durationHours: number | null;
  serviceType: string;
  cleaner: CleanerDetails | null;
}

interface TimeOffRequest {
  id: number;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  cleaner: CleanerDetails | null;
}

export function BookingCalendarPicker({
  value,
  onChange,
  error,
}: BookingCalendarPickerProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize with the selected date if provided, otherwise current month
    // Handle potential string input safely
    return value ? new Date(value + "T12:00:00") : new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    return value ? new Date(value + "T12:00:00") : null;
  });

  // Get the start and end of the month for the query
  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getMonthEnd = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const monthStart = getMonthStart(currentDate);
  const monthEnd = getMonthEnd(currentDate);

  // Fetch booking availability for the current month
  const availabilityQuery = useQuery({
    ...trpc.getBookingAvailability.queryOptions({
      authToken: token || "",
      startDate: monthStart.toISOString().split("T")[0] || "",
      endDate: monthEnd.toISOString().split("T")[0] || "",
    }),
    enabled: !!token,
  });

  const getDaysInMonth = (date: Date) => {
    const start = getMonthStart(date);
    const end = getMonthEnd(date);
    const days: Date[] = [];

    // Add days from previous month to fill the first week
    const startDay = start.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(start);
      day.setDate(day.getDate() - i - 1);
      days.push(day);
    }

    // Add days of current month
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), i));
    }

    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(end);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const getBookingsForDate = (date: Date): BookingAvailability[] => {
    if (!availabilityQuery.data?.bookings) return [];

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return availabilityQuery.data.bookings.filter((booking) => {
      // scheduledDate is a Date object from tRPC/superjson
      const bookingDate = booking.scheduledDate;
      return (
        bookingDate.getFullYear() === year &&
        bookingDate.getMonth() === month &&
        bookingDate.getDate() === day
      );
    });
  };

  const getTimeOffsForDate = (date: Date): TimeOffRequest[] => {
    if (!availabilityQuery.data?.timeOffRequests) return [];

    // Normalize check date to noon UTC to match storage convention
    const checkDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0));

    return availabilityQuery.data.timeOffRequests.filter((request) => {
      // startDate/endDate are Date objects from tRPC/superjson
      const start = request.startDate;
      const end = request.endDate;
      return checkDate >= start && checkDate <= end;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isSameDate = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    if (!isCurrentMonth(date)) return;

    setSelectedDate(date);
    // Format date as YYYY-MM-DD for the form
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });
  const year = currentDate.getFullYear();

  const selectedDayBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  const selectedDayTimeOffs = selectedDate ? getTimeOffsForDate(selectedDate) : [];

  // Calculate busy level for visual indication (0-3 scale)
  const getBusyLevel = (bookingCount: number): number => {
    if (bookingCount === 0) return 0;
    if (bookingCount <= 2) return 1;
    if (bookingCount <= 4) return 2;
    return 3;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h3 className="text-lg font-semibold">
              {monthName} {year}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={previousMonth}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Loading State */}
        {availabilityQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        )}

        {/* Error State */}
        {availabilityQuery.isError && (
          <div className="text-center py-8 text-red-600">
            <p className="text-sm">Failed to load availability</p>
          </div>
        )}

        {/* Calendar */}
        {availabilityQuery.data && (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dayBookings = getBookingsForDate(day);
                const bookingCount = dayBookings.length;
                const busyLevel = getBusyLevel(bookingCount);
                const isCurrentMonthDay = isCurrentMonth(day);
                const isTodayDay = isToday(day);
                const isSelected = isSameDate(selectedDate, day);

                // Determine background color based on busy level
                let bgColor = "bg-white";
                let textColor = "text-gray-900";
                let borderColor = "border-gray-200";

                if (!isCurrentMonthDay) {
                  bgColor = "bg-gray-50";
                  textColor = "text-gray-400";
                } else if (isSelected) {
                  bgColor = "bg-primary";
                  textColor = "text-white";
                  borderColor = "border-primary";
                } else if (busyLevel === 3) {
                  bgColor = "bg-red-100";
                  borderColor = "border-red-300";
                } else if (busyLevel === 2) {
                  bgColor = "bg-yellow-100";
                  borderColor = "border-yellow-300";
                } else if (busyLevel === 1) {
                  bgColor = "bg-green-100";
                  borderColor = "border-green-300";
                }

                if (isTodayDay && !isSelected) {
                  borderColor = "border-primary ring-2 ring-primary/20";
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={!isCurrentMonthDay}
                    className={`min-h-[60px] border rounded-lg p-2 transition-all ${bgColor} ${borderColor} ${
                      isCurrentMonthDay
                        ? "hover:shadow-md cursor-pointer"
                        : "cursor-not-allowed"
                    } ${isSelected ? "ring-2 ring-primary/50" : ""}`}
                  >
                    <div className={`text-sm font-semibold mb-1 ${textColor}`}>
                      {day.getDate()}
                    </div>
                    {isCurrentMonthDay && bookingCount > 0 && (
                      <div
                        className={`text-xs font-bold ${
                          isSelected ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {bookingCount} {bookingCount === 1 ? "booking" : "bookings"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Schedule Breakdown for Selected Day */}
      {selectedDate && (selectedDayBookings.length > 0 || selectedDayTimeOffs.length > 0) && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">
              Schedule for {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h4>
          </div>
          <div className="space-y-2">
            {selectedDayBookings.map((booking) => {
              const cleanerName = booking.cleaner
                ? `${booking.cleaner.firstName || ""} ${booking.cleaner.lastName || ""}`.trim() || "Unassigned"
                : "Unassigned";

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg border border-blue-200 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {formatTime12Hour(booking.scheduledTime)}
                      </div>
                      <div className="text-sm text-gray-600">{booking.serviceType}</div>
                    </div>
                    {booking.durationHours && (
                      <div className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        {formatDurationHours(booking.durationHours)}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <span className="font-medium">Cleaner:</span>
                    <span className={booking.cleaner ? "text-gray-700" : "text-gray-400 italic"}>
                      {cleanerName}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Time Off Requests */}
            {selectedDayTimeOffs.map((request) => {
              const cleanerName = request.cleaner
                ? `${request.cleaner.firstName || ""} ${request.cleaner.lastName || ""}`.trim() || "Unknown Cleaner"
                : "Unknown Cleaner";

              return (
                <div
                  key={`timeoff-${request.id}`}
                  className="bg-orange-50 rounded-lg border border-orange-200 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>Time Off</span>
                        <span className="text-xs font-normal text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                          Unavailable
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {request.reason || "Scheduled Time Off"}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <span className="font-medium">Cleaner:</span>
                    <span className="text-gray-900">{cleanerName}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-600">
              💡 These times are already booked. Consider scheduling around them.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span className="text-red-500">•</span> {error}
        </p>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Availability Legend:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600">Light (1-2 bookings)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-600">Moderate (3-4 bookings)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">Busy (5+ bookings)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
            <span className="text-gray-600">Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
