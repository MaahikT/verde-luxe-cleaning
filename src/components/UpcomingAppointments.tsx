import { Calendar, Clock, User, MapPin, AlertCircle } from "lucide-react";
import { formatTime12Hour } from "~/utils/formatTime";

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

interface UpcomingBooking {
  id: number;
  clientId: number;
  cleanerId: number | null;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  client: BookingClient;
  cleaner: BookingCleaner | null;
}

interface UpcomingAppointmentsProps {
  appointments: UpcomingBooking[];
  onBookingClick?: (booking: UpcomingBooking) => void;
}

export function UpcomingAppointments({ appointments, onBookingClick }: UpcomingAppointmentsProps) {
  const formatDate = (dateString: string) => {
    // Dates are stored at noon UTC (T12:00:00.000Z) to avoid day boundary issues
    // When displayed in local time, they will always show the correct date
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Upcoming Appointments</h3>
          <p className="text-sm text-gray-600">Next scheduled bookings</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No upcoming appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => onBookingClick?.(appointment)}
              className={`border border-gray-200 rounded-lg p-4 transition-all duration-200 ${
                onBookingClick
                  ? "cursor-pointer hover:border-primary hover:shadow-md hover:scale-[1.02]"
                  : ""
              }`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {formatDate(appointment.scheduledDate).slice(0, 3)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatDate(appointment.scheduledDate)}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime12Hour(appointment.scheduledTime)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Client: </span>
                    <span className="font-medium text-gray-900">
                      {appointment.client.firstName} {appointment.client.lastName}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Service: </span>
                    <span className="font-medium text-gray-900">{appointment.serviceType}</span>
                  </div>
                </div>

                {appointment.cleaner ? (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-600">Cleaner: </span>
                      <span className="font-medium text-gray-900">
                        {appointment.cleaner.firstName} {appointment.cleaner.lastName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-yellow-700 bg-yellow-50 -mx-4 -mb-4 mt-3 p-3 rounded-b-lg border-t border-yellow-100">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">No cleaner assigned</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
