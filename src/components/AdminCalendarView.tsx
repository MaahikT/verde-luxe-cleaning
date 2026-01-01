import { Calendar, ChevronLeft, ChevronRight, Plus, CheckSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { formatTime12Hour } from "~/utils/formatTime";
import { BookingTooltip } from "~/components/BookingTooltip";

export interface Booking {
  id: number;
  serviceType: string;
  scheduledDate: string | Date;
  scheduledTime: string;
  address: string;
  durationHours: number | null;
  finalPrice: number | null;
  serviceFrequency: string | null;
  clientId: number;
  cleanerId: number | null;
  status: string;
  specialInstructions: string | null;
  houseSquareFootage: number | null;
  basementSquareFootage: number | null;
  numberOfBedrooms: number | null;
  numberOfBathrooms: number | null;
  numberOfCleanersRequested: number | null;
  cleanerPaymentAmount: number | null;
  selectedExtras: any;
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
    color?: string | null;
    role?: string;
  } | null;
  checklist?: {
    id: number;
    items: {
      id: number;
      isCompleted: boolean;
    }[];
  } | null;
  payments?: {
    id: number;
    status: string | null;
    amount: number;
    createdAt: Date;
    description: string | null;
  }[];
}

interface AdminCalendarViewProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onCreateBooking: () => void;
  onViewChecklist?: (bookingId: number) => void;
  onBookingUpdate?: (booking: Booking, newDate: Date, newTime?: string, updateMode?: 'SINGLE' | 'FUTURE') => void;
}

export function AdminCalendarView({
  bookings,
  onBookingClick,
  onCreateBooking,
  onViewChecklist,
  onBookingUpdate,
}: AdminCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [tooltipTarget, setTooltipTarget] = useState<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Sync hoveredBooking with latest data when bookings update
  useEffect(() => {
    if (hoveredBooking) {
      const freshBooking = bookings.find(b => b.id === hoveredBooking.id);
      // Only update if the object reference has changed (implies data update)
      if (freshBooking && freshBooking !== hoveredBooking) {
        setHoveredBooking(freshBooking);
      }
    }
  }, [bookings, hoveredBooking]);

  // Drag and drop state
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ booking: Booking, newDate: Date, newTime?: string } | null>(null);

  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getMonthEnd = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const getEndDate = (startDate: Date, daysToAdd: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + daysToAdd);
    return d;
  };

  const getDaysForView = () => {
    const days: Date[] = [];

    if (view === "month") {
      const start = getMonthStart(currentDate);
      const end = getMonthEnd(currentDate);

      const startDay = start.getDay();
      for (let i = startDay - 1; i >= 0; i--) {
        const day = new Date(start);
        day.setDate(day.getDate() - i - 1);
        days.push(day);
      }

      for (let i = 1; i <= end.getDate(); i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
      }

      const remainingDays = 42 - days.length;
      for (let i = 1; i <= remainingDays; i++) {
        const day = new Date(end);
        day.setDate(day.getDate() + i);
        days.push(day);
      }
    } else if (view === "week") {
      const start = getWeekStart(currentDate);
      for (let i = 0; i < 7; i++) {
        days.push(getEndDate(start, i));
      }
    } else if (view === "day") {
      days.push(new Date(currentDate));
    }

    return days;
  };

  const getBookingsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return bookings.filter((booking) => {
      // Filter out cancelled bookings from calendar view
      if ((booking as any).status === "CANCELLED") return false;

      const bookingDate = new Date(booking.scheduledDate);
      return (
        bookingDate.getFullYear() === year &&
        bookingDate.getMonth() === month &&
        bookingDate.getDate() === day
      );
    });
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
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

  const days = getDaysForView();

  const getHeaderTitle = () => {
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else if (view === "week") {
      const start = getWeekStart(currentDate);
      const end = getEndDate(start, 6);
      const startMonth = start.toLocaleDateString("en-US", { month: "short" });
      const endMonth = end.toLocaleDateString("en-US", { month: "short" });
      if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    if (!onBookingUpdate) return;

    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("bookingId", booking.id.toString());

    // Set a custom drag image or style if needed
    // e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!onBookingUpdate || !draggedBooking) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnDay = (e: React.DragEvent, targetDate: Date) => {
    if (!onBookingUpdate || !draggedBooking) return;
    e.preventDefault();

    // Don't update if dropped on source day in month view (unless we want to support time change later via modal, currently just date)
    const sourceDate = new Date(draggedBooking.scheduledDate);
    if (
        sourceDate.getDate() === targetDate.getDate() &&
        sourceDate.getMonth() === targetDate.getMonth() &&
        sourceDate.getFullYear() === targetDate.getFullYear()
    ) {
        setDraggedBooking(null);
        return;
    }

    if (draggedBooking.serviceFrequency && draggedBooking.serviceFrequency !== 'ONE_TIME') {
        setPendingDrop({ booking: draggedBooking, newDate: targetDate });
        setShowRecurrenceModal(true);
    } else {
        onBookingUpdate(draggedBooking, targetDate, undefined, 'SINGLE');
    }
    setDraggedBooking(null);
  };

  const handleDropOnGrid = (e: React.DragEvent) => {
    if (!onBookingUpdate || !draggedBooking || !gridRef.current) return;
    e.preventDefault();

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate Day
    const colWidth = rect.width / (view === 'day' ? 1 : 7);
    const colIndex = Math.floor(x / colWidth);

    // Safety check for index
    if (colIndex < 0 || colIndex >= days.length) {
        setDraggedBooking(null);
        return;
    }

    const targetDate = days[colIndex];
    if (!targetDate) { // Should not happen if logic matches display
        setDraggedBooking(null);
        return;
    }

    // Calculate Time
    // Grid starts at 7 AM. 60px per hour.
    const GRID_START_HOUR = 7;
    const HOUR_HEIGHT = 60;

    const hoursFromStart = y / HOUR_HEIGHT;
    const totalHours = GRID_START_HOUR + hoursFromStart;

    let hour = Math.floor(totalHours);
    let minutes = Math.round((totalHours - hour) * 60);

    // Snap to nearest 15 minutes
    const SNAP_MINUTES = 15;
    const snappedMinutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

    if (snappedMinutes === 60) {
        hour += 1;
        minutes = 0;
    } else {
        minutes = snappedMinutes;
    }

    // Format new time string "HH:MM"
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const newTime = `${hour.toString().padStart(2, '0')}:${formattedMinutes}`;

    if (draggedBooking.serviceFrequency && draggedBooking.serviceFrequency !== 'ONE_TIME') {
        setPendingDrop({ booking: draggedBooking, newDate: targetDate, newTime });
        setShowRecurrenceModal(true);
    } else {
        onBookingUpdate(draggedBooking, targetDate, newTime, 'SINGLE');
    }
    setDraggedBooking(null);
  };

  const gridRef = useRef<HTMLDivElement>(null);

  const renderBookingCard = (booking: Booking) => {
    const checklist = booking.checklist;
    const completedItems = checklist?.items.filter(item => item.isCompleted).length || 0;
    const totalItems = checklist?.items.length || 0;
    const hasChecklist = checklist && totalItems > 0;

    const bookingColor = booking.cleaner?.color || '#9CA3AF';
    const bookingBgColor = booking.cleaner?.color ? `${bookingColor}1A` : '#F3F4F6';
    const bookingBorderColor = booking.cleaner?.color || '#D1D5DB';

    return (
      <div key={booking.id} className="relative mb-1">
        <button
          draggable={!!onBookingUpdate}
          onDragStart={(e) => handleDragStart(e, booking)}
          onClick={() => onBookingClick(booking)}
          onMouseEnter={(e) => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setHoveredBooking(booking);
            setTooltipTarget(e.currentTarget);
          }}
          onMouseLeave={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            hoverTimeoutRef.current = window.setTimeout(() => {
              setHoveredBooking(null);
              setTooltipTarget(null);
            }, 200);
          }}
          className="w-full text-left text-xs p-1.5 rounded border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: bookingBgColor,
            borderColor: bookingBorderColor,
            color: '#1F2937',
            opacity: draggedBooking?.id === booking.id ? 0.5 : 1,
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
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 sm:p-6">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">
                {getHeaderTitle()}
              </h2>
            </div>

            {/* Mobile Navigation */}
            <div className="flex xl:hidden items-center gap-1">
              <button onClick={navigatePrevious} className="p-1.5 bg-white/10 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={navigateNext} className="p-1.5 bg-white/10 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            {/* View Tabs */}
            <div className="flex bg-white/10 p-1 rounded-lg w-full sm:w-auto">
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                    view === v
                      ? "bg-white text-primary shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
               <button
                  onClick={navigateToday}
                  className="hidden sm:block px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
               >
                  Today
               </button>
               {/* Desktop Navigation */}
              <div className="hidden xl:flex items-center gap-1">
                <button
                  onClick={navigatePrevious}
                  className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={navigateNext}
                  className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={onCreateBooking}
                className="flex-1 sm:flex-none ml-2 flex items-center justify-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-lg sm:shadow-none"
              >
                <Plus className="w-4 h-4" />
                <span className="sm:hidden lg:inline">New Booking</span>
                <span className="hidden sm:inline lg:hidden">New</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Header Row (Days) */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="w-16 flex-shrink-0 border-r border-gray-100 bg-gray-50/50"></div> {/* Time column header placeholder */}
          <div className={`flex-1 grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
            {view === 'day' ? (
              <div className="text-center py-3 border-l border-gray-100 bg-primary/5">
                 <div className="text-primary font-bold">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                 <div className="text-2xl font-bold text-primary">{currentDate.getDate()}</div>
              </div>
            ) : (
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, index) => {
                const date = days[index];
                const isTodayDay = date ? isToday(date) : false;
                return (
                  <div
                    key={dayName}
                    className={`text-center py-2 border-l border-gray-100 ${isTodayDay ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`text-xs font-semibold uppercase ${isTodayDay ? 'text-primary' : 'text-gray-500'}`}>{dayName}</div>
                    {view === 'week' && date && (
                      <div className={`text-lg font-bold ${isTodayDay ? 'text-primary' : 'text-gray-900'}`}>{date.getDate()}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scrollable Grid Body */}
        {view === 'month' ? (
           <div className="p-4 grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayBookings = getBookingsForDate(day);
              const isCurrentMonthDay = isCurrentMonth(day);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, day)}
                  className={`flex flex-col p-2 border rounded-lg min-h-[120px] transition-colors ${
                    isCurrentMonthDay
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-gray-100"
                  } ${isTodayDay ? "ring-2 ring-primary" : ""} ${draggedBooking && isCurrentMonthDay ? "hover:bg-blue-50" : ""}`}
                >
                  <div
                    className={`text-sm font-semibold mb-2 ${
                      isCurrentMonthDay ? "text-gray-900" : "text-gray-400"
                    } ${isTodayDay ? "text-primary" : ""}`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-1 flex-1">
                    {dayBookings.map((booking) => renderBookingCard(booking))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 relative mt-4">
            {/* Time Labels Column */}
            <div className="w-16 flex-shrink-0 flex flex-col border-r border-gray-200 bg-gray-50 select-none">
              {Array.from({ length: 17 }).map((_, i) => { // 7 AM to 11 PM = 16 hours + 1 for end
                const hour = i + 7;
                return (
                  <div key={hour} className="h-[60px] relative">
                    <span className="absolute -top-2.5 right-2 text-xs text-gray-500">
                      {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Main Grid */}
            <div
                ref={gridRef}
                className={`flex-1 grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'} relative min-h-[1020px]`}
                onDragOver={handleDragOver}
                onDrop={handleDropOnGrid}
            >
              {/* Horizontal Hour Lines Background */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {Array.from({ length: 17 }).map((_, i) => (
                  <div key={i} className="h-[60px] border-b border-gray-100 w-full relative">
                    {/* 30-minute dotted line */}
                    {i < 16 && (
                      <div className="absolute top-[30px] left-0 right-0 border-t border-dotted border-gray-100 w-full" />
                    )}
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {days.map((day, dayIndex) => {
                const dayBookings = getBookingsForDate(day);

                // Define extended type for layout
                type BookingWithLayout = Booking & { startTime: number; endTime: number; laneIndex?: number };

                // Simple overlapping logic: group overlapping bookings
                const bookingsWithLayout: BookingWithLayout[] = dayBookings.map(b => {
                   const startParts = (b.scheduledTime || "00:00").split(':');
                   const startHour = parseInt(startParts[0] || "0");
                   const startMin = parseInt(startParts[1] || "0");
                   const startTime = startHour + (startMin / 60);

                   const duration = b.durationHours || 1;
                   const endTime = startTime + duration;

                   return { ...b, startTime, endTime };
                }).sort((a, b) => a.startTime - b.startTime);

                // Assign columns to overlapping bookings
                const renderedBookings: BookingWithLayout[] = [];
                const lanes: BookingWithLayout[][] = [];

                bookingsWithLayout.forEach(booking => {
                   let placed = false;
                   for (let i = 0; i < lanes.length; i++) {
                      const lane = lanes[i];
                      if (!lane) continue;

                      const lastInLane = lane[lane.length - 1];
                      if (lastInLane && booking.startTime >= lastInLane.endTime) {
                         lane.push(booking);
                         renderedBookings.push({ ...booking, laneIndex: i });
                         placed = true;
                         break;
                      }
                   }
                   if (!placed) {
                      lanes.push([booking]);
                      renderedBookings.push({ ...booking, laneIndex: lanes.length - 1 });
                   }
                });

                const totalLanes = lanes.length;

                return (
                  <div key={dayIndex} className="relative border-l border-gray-100 first:border-l-0 h-full hover:bg-blue-50/30 transition-colors">
                     {renderedBookings.map((booking) => {
                       // Constants
                       const GRID_START_HOUR = 7;
                       const HOUR_HEIGHT = 60; // px

                       const top = (booking.startTime - GRID_START_HOUR) * HOUR_HEIGHT;
                       const height = (booking.durationHours || 1) * HOUR_HEIGHT;

                       // Width logic
                       const widthPercent = 100 / totalLanes;
                       const leftPercent = (booking.laneIndex || 0) * widthPercent;

                       // Style colors
                       const bookingColor = booking.cleaner?.color || '#9CA3AF';

                       return (
                         <div
                           draggable={!!onBookingUpdate}
                           onDragStart={(e) => handleDragStart(e, booking)}
                           key={booking.id}
                           className="absolute rounded border border-white/50 shadow-sm text-[10px] leading-tight overflow-hidden hover:z-30 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing"
                           style={{
                             top: `${top}px`,
                             height: `${height}px`,
                             left: `${leftPercent}%`,
                             width: `${widthPercent}%`,
                             backgroundColor: bookingColor,
                             color: '#FFFFFF',
                             opacity: draggedBooking?.id === booking.id ? 0.5 : 1,
                           }}
                           onClick={(e) => {
                             e.stopPropagation();
                             onBookingClick(booking);
                           }}
                           onMouseEnter={(e) => {
                             setHoveredBooking(booking);
                             setTooltipTarget(e.currentTarget);
                           }}
                           onMouseLeave={() => {
                             setHoveredBooking(null);
                             setTooltipTarget(null);
                           }}
                         >
                           <div className="p-1 h-full flex flex-col pointer-events-none">
                             <div className="font-bold truncate">{formatTime12Hour(booking.scheduledTime)}</div>
                             <div className="truncate font-medium">{booking.client.firstName} {booking.client.lastName}</div>
                             {booking.cleaner && <div className="truncate opacity-90 text-[9px]">{booking.cleaner.firstName}</div>}
                           </div>
                         </div>
                       );
                     })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Booking Tooltip */}
      {hoveredBooking && tooltipTarget && !draggedBooking && (
        <BookingTooltip
          booking={hoveredBooking}
          targetElement={tooltipTarget}
          visible={true}
        />
      )}

      {/* Recurrence Confirmation Modal */}
      {showRecurrenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1005] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Update Recurring Booking?</h3>
            <p className="text-gray-600 mb-6">
              This is a recurring booking. Do you want to move only this booking, or this and all future bookings in the series?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (pendingDrop && onBookingUpdate) {
                    onBookingUpdate(pendingDrop.booking, pendingDrop.newDate, pendingDrop.newTime, 'SINGLE');
                  }
                  setShowRecurrenceModal(false);
                  setPendingDrop(null);
                }}
                className="w-full px-4 py-2 border border-primary text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors"
              >
                This booking only
              </button>
              <button
                onClick={() => {
                  if (pendingDrop && onBookingUpdate) {
                    onBookingUpdate(pendingDrop.booking, pendingDrop.newDate, pendingDrop.newTime, 'FUTURE');
                  }
                  setShowRecurrenceModal(false);
                  setPendingDrop(null);
                }}
                className="w-full px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
              >
                This and future bookings
              </button>
              <button
                onClick={() => {
                  setShowRecurrenceModal(false);
                  setPendingDrop(null);
                }}
                className="w-full px-4 py-2 text-gray-500 font-medium rounded-lg hover:bg-gray-100 transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
