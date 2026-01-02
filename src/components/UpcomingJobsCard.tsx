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
  scheduledDate: string | Date;
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
  const formatDate = (dateInput: string | Date) => {
    const date = new Date(dateInput);
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
    <div className="bg-brand-white rounded-[20px] p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-medium text-brand-black mb-0.5">Upcoming Jobs</h3>
          <p className="text-xs text-brand-grey">Next 2 days</p>
        </div>
        <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-brand-black" />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="w-10 h-10 text-brand-grey mx-auto mb-2 opacity-50" />
          <p className="text-brand-grey text-xs">No jobs scheduled</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onJobClick?.(job)}
              className={`group flex items-center p-2.5 rounded-xl border border-transparent hover:border-brand-border hover:bg-brand-bg-light/30 transition-all ${
                onJobClick ? "cursor-pointer" : ""
              }`}
            >
               <div className="w-10 h-10 rounded-lg bg-brand-tosca/40 flex flex-col items-center justify-center text-brand-black flex-shrink-0">
                  <span className="text-[9px] font-bold uppercase">{formatDate(job.scheduledDate).slice(0, 3)}</span>
                  <span className="text-[9px]">{formatTime12Hour(job.scheduledTime).split(' ')[0]}</span>
               </div>

              <div className="ml-3 flex-1 min-w-0">
                <h4 className="text-sm font-medium text-brand-black truncate">
                   {job.client.firstName} {job.client.lastName}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-brand-grey truncate">{job.serviceType}</p>
                    {job.cleaner ? (
                        <p className="text-[10px] text-brand-black truncate flex items-center gap-1">
                            • {job.cleaner.firstName}
                        </p>
                    ) : (
                        <p className="text-[10px] text-brand-red truncate flex items-center gap-1">
                             • Unassigned
                        </p>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
