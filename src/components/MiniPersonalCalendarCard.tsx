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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">My Calendar</h3>
          <p className="text-xs text-gray-600">Personal tasks & reminders</p>
        </div>
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-purple-600" />
        </div>
      </div>

      {/* Current Date Display */}
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-lg p-3 mb-3">
        <p className="text-xs font-medium opacity-90">
          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
        </p>
        <p className="text-2xl font-bold mt-0.5">
          {new Date().toLocaleDateString('en-US', { day: 'numeric' })}
        </p>
        <p className="text-xs opacity-90">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Upcoming Days Row */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-2">
        {upcomingDays.map((date, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(date)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-10 h-12 rounded-lg transition-all ${
              isSameDay(date, selectedDate)
                ? "bg-primary text-white shadow-md"
                : isToday(date)
                ? "bg-blue-50 text-blue-600 border border-blue-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="text-xs font-medium">
              {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
            </span>
            <span className="text-base font-bold">
              {date.getDate()}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare className="w-4 h-4 text-gray-600" />
          <h4 className="text-xs font-semibold text-gray-900">Today's Tasks</h4>
        </div>
        
        {displayTasks.length === 0 ? (
          <div className="text-center py-4">
            <CheckSquare className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
            <p className="text-xs text-gray-600">No tasks for today</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className={`border-l-4 rounded-r-lg p-2.5 transition-colors ${
                  task.priority === "high"
                    ? "border-red-500 bg-red-50"
                    : task.priority === "medium"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                      {task.description}
                    </p>
                  </div>
                  {task.time && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />
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
