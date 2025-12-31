import { useState } from "react";
import { Search, Bell, User } from "lucide-react";
import { useAuthStore } from "~/stores/authStore";

interface DashboardHeaderProps {
  /** Optional custom subtitle text. Defaults to "Manage your cleaning business overview." */
  subtitle?: string;
  /** Optional flag to show notification badge on bell icon */
  hasUnreadNotifications?: boolean;
}

export function DashboardHeader({ 
  subtitle = "Manage your cleaning business overview.",
  hasUnreadNotifications = false 
}: DashboardHeaderProps) {
  const { user } = useAuthStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!user) return null;

  // Format role for display
  const roleDisplay = user.role === "OWNER" ? "Owner" : 
                      user.role === "ADMIN" ? "Admin" : 
                      user.role === "CLEANER" ? "Cleaner" : 
                      "Client";

  return (
    <div className="bg-[#EAE9E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Greeting Block */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-heading">
              Hello, {user.firstName || user.email.split('@')[0]}!
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {subtitle}
            </p>
          </div>

          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative">
              {isSearchOpen ? (
                <input
                  type="text"
                  placeholder="Search..."
                  autoFocus
                  onBlur={() => setIsSearchOpen(false)}
                  className="w-48 sm:w-64 px-4 py-2 pr-10 rounded-full border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            {/* Notifications */}
            <button
              className="relative w-10 h-10 rounded-full bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {hasUnreadNotifications && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Profile Area */}
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-full pl-3 pr-4 py-2 border border-gray-300 shadow-sm">
              {/* Profile Picture Circle */}
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              
              {/* Name and Role */}
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </p>
                <p className="text-xs text-gray-600">
                  {roleDisplay}
                </p>
              </div>
            </div>

            {/* Mobile Profile (Icon Only) */}
            <button
              className="sm:hidden w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm"
              aria-label="Profile"
            >
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
