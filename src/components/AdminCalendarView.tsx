import { Calendar, ChevronLeft, ChevronRight, Plus, CheckSquare } from "lucide-react";
import { useState, useRef } from "react";
import { formatTime12Hour } from "~/utils/formatTime";
import { BookingTooltip } from "~/components/BookingTooltip";

interface Booking {
  id: number;
  serviceType: string;
  scheduledDate: string | Date;
  scheduledTime: string;
  address: string;
  durationHours: number | null;
  finalPrice: number | null;
  serviceFrequency: string | null;
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
    color?: string | null;
  } | null;
  checklist?: {
    id: number;
    items: {
      id: number;
      isCompleted: boolean;
    }[];
  } | null;
}

interface AdminCalendarViewProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onCreateBooking: () => void;
  onViewChecklist?: (bookingId: number) => void;
}

export function AdminCalendarView({
  bookings,
  onBookingClick,
  onCreateBooking,
  onViewChecklist,
}: AdminCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [tooltipTarget, setTooltipTarget] = useState<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getMonthEnd = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

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

  const getBookingsForDate = (date: Date) => {
    // Use UTC date parts for comparison to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.scheduledDate);
      return (
        bookingDate.getFullYear() === year &&
        bookingDate.getMonth() === month &&
        bookingDate.getDate() === day
      );
    });
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

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });
  const year = currentDate.getFullYear();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">
              {monthName} {year}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={onCreateBooking}
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayBookings = getBookingsForDate(day);
            const isCurrentMonthDay = isCurrentMonth(day);
            const isTodayDay = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-[120px] border rounded-lg p-2 ${
                  isCurrentMonthDay
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-100"
                } ${isTodayDay ? "ring-2 ring-primary" : ""}`}
              >
                <div
                  className={`text-sm font-semibold mb-2 ${
                    isCurrentMonthDay ? "text-gray-900" : "text-gray-400"
                  } ${isTodayDay ? "text-primary" : ""}`}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayBookings.map((booking) => {
                    const checklist = booking.checklist;
                    const completedItems = checklist?.items.filter(item => item.isCompleted).length || 0;
                    const totalItems = checklist?.items.length || 0;
                    const hasChecklist = checklist && totalItems > 0;

                    const bookingColor = booking.cleaner?.color || '#9CA3AF';
                    const bookingBgColor = booking.cleaner?.color ? `${bookingColor}1A` : '#F3F4F6'; // 1A = 10% opacity
                    const bookingBorderColor = booking.cleaner?.color || '#D1D5DB';

                    return (
                    <div key={booking.id} className="relative">
                      <button
                        onClick={() => onBookingClick(booking)}
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
                        className="w-full text-left text-xs p-1.5 rounded border hover:shadow-md transition-shadow"
                        style={{
                          backgroundColor: bookingBgColor,
                          borderColor: bookingBorderColor,
                          color: '#1F2937', // dark gray text for readability
                        }}
                      >
                        <div className="font-semibold truncate">
                          {formatTime12Hour(booking.scheduledTime)}
                        </div>
                        <div className="truncate">
                          {booking.client.firstName} {booking.client.lastName}
                        </div>
                      </button>
                      {hasChecklist && onViewChecklist && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewChecklist(booking.id);
                          }}
                          className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/90 text-white rounded text-[10px] font-semibold hover:bg-primary transition-colors"
                          title="View checklist"
                        >
                          <CheckSquare className="w-2.5 h-2.5" />
                          {completedItems}/{totalItems}
                        </button>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Tooltip */}
      {hoveredBooking && tooltipTarget && (
        <BookingTooltip
          booking={hoveredBooking}
          targetElement={tooltipTarget}
          visible={true}
        />
      )}
    </div>
  );
}
