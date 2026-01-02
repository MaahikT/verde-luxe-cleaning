import { useState } from "react";
import { Calendar, Clock, CheckSquare, AlertCircle } from "lucide-react";

interface Task {
  id: number;
  title: string;
  time?: string;
  description: string;
  priority?: "high" | "medium" | "low";
}

interface MiniPersonalCalendarCardProps {
  tasks?: Task[];
}

export function MiniPersonalCalendarCard({ tasks = [] }: MiniPersonalCalendarCardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate upcoming 7 days
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  // Default tasks if none provided
  const defaultTasks: Task[] = [
    {
      id: 1,
      title: "Review pending charges",
      time: "9:00 AM",
      description: "Check and process completed jobs",
      priority: "high",
    },
    {
      id: 2,
      title: "Assign cleaners",
      time: "10:30 AM",
      description: "Upcoming bookings need assignments",
      priority: "medium",
    },
    {
      id: 3,
      title: "Follow up with clients",
      description: "Customer satisfaction check-ins",
      priority: "low",
    },
  ];

  const displayTasks = tasks.length > 0 ? tasks : defaultTasks;

  return (
    <div className="bg-brand-white rounded-[20px] p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-medium text-brand-black mb-0.5">My Calendar</h3>
          <p className="text-xs text-brand-grey">Personal tasks & reminders</p>
        </div>
        <div className="w-8 h-8 bg-brand-tosca/50 rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-brand-black" />
        </div>
      </div>

      {/* Date Strip */}
      <div className="flex justify-between items-center mb-3 bg-brand-bg-light rounded-xl p-1.5">
        {upcomingDays.slice(0, 5).map((date, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(date)}
            className={`flex flex-col items-center justify-center w-8 h-9 rounded-lg transition-all ${
               isSameDay(date, selectedDate)
                ? "bg-brand-black text-white shadow-md"
                : isToday(date)
                ? "text-brand-accent-green"
                : "text-brand-grey hover:bg-white/50"
            }`}
          >
            <span className="text-[9px] font-medium leading-none mb-0.5">
              {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
            </span>
            <span className="text-xs font-bold leading-none">
              {date.getDate()}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2.5 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare className="w-3 h-3 text-brand-grey" />
          <h4 className="text-[10px] font-bold text-brand-grey uppercase tracking-wider">Today's Tasks</h4>
        </div>

        {displayTasks.length === 0 ? (
          <div className="text-center py-4">
            <CheckSquare className="w-6 h-6 text-brand-grey mx-auto mb-1.5 opacity-50" />
            <p className="text-xs text-brand-grey">No tasks for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className={`border-l-2 rounded-r-lg pl-2.5 py-1 transition-colors ${
                  task.priority === "high"
                    ? "border-brand-red bg-brand-red/5"
                    : task.priority === "medium"
                    ? "border-brand-accent-green bg-brand-accent-green/5"
                    : "border-brand-grey bg-brand-bg-light/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-brand-black truncate">
                      {task.title}
                    </p>
                  </div>
                  {task.time && (
                    <div className="flex items-center gap-1 text-[10px] text-brand-grey flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {task.time}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
