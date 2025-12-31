import { Calendar, Clock, User, AlertCircle } from "lucide-react";
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
  color: string | null;
}

interface UpcomingJob {
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

interface UpcomingJobsCardProps {
  jobs: UpcomingJob[];
  onJobClick?: (job: UpcomingJob) => void;
}

export function UpcomingJobsCard({ jobs, onJobClick }: UpcomingJobsCardProps) {
  const formatDate = (dateString: string) => {
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
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Upcoming Jobs</h3>
          <p className="text-xs text-gray-600">Next 2 days</p>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">No jobs scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onJobClick?.(job)}
              className={`border border-gray-200 rounded-lg p-3 transition-all ${
                onJobClick ? "cursor-pointer hover:border-primary hover:shadow-sm" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    {formatDate(job.scheduledDate).slice(0, 3)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      {formatDate(job.scheduledDate)}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime12Hour(job.scheduledTime)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium text-gray-900 truncate">
                    {job.client.firstName} {job.client.lastName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600 ml-5">Service:</span>
                  <span className="font-medium text-gray-900 truncate">{job.serviceType}</span>
                </div>

                {job.cleaner ? (
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Cleaner:</span>
                    <span className="font-medium text-gray-900 truncate">
                      {job.cleaner.firstName} {job.cleaner.lastName}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 -mx-3 -mb-3 mt-2 p-2 rounded-b-lg">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs font-medium">No cleaner assigned</span>
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
