import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Menu,
  X,
  Settings,
  ClipboardList,
  BarChart2,
  CalendarOff,
  Briefcase,
  UserCog,
  CreditCard,
  Building2,
  Layers,
  LogOut,
  HelpCircle,
  Package,
  Zap,
  Mail
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

interface NavItem {
  label: string;
  view: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
}

interface PortalSidebarProps {
  portalType: "admin" | "cleaner" | "client";
}

export function PortalSidebar({ portalType }: PortalSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [hoveredParentView, setHoveredParentView] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const router = useRouterState();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  // Cleanup any pending hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Define navigation items based on portal type
  const getNavItems = (): NavItem[] => {
    if (portalType === "admin") {
      return [
        { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
        { label: "Leads", view: "leads", icon: Layers },
        {
          label: "Automations",
          view: "automations",
          icon: Zap,
          subItems: [
            { label: "Email", view: "automations-email", icon: Mail },
          ],
        },
        {
          label: "Bookings",
          view: "bookings",
          icon: Calendar,
          subItems: [
            { label: "Calendar", view: "bookings-calendar", icon: Calendar },
            { label: "Charges", view: "booking-charges", icon: DollarSign },
          ],
        },
        {
          label: "Management",
          view: "management",
          icon: Briefcase,
          subItems: [
            { label: "Customers", view: "management-customers", icon: Users },
            { label: "Cleaners", view: "management-cleaners", icon: UserCog },
            { label: "Admins", view: "management-admins", icon: Settings },
          ],
        },
        { label: "Bank Transactions", view: "bank-transactions", icon: Building2 },
        { label: "Requests", view: "cleaner-requests", icon: CalendarOff },
        { label: "Reports", view: "reports", icon: BarChart2 },
        {
          label: "Settings",
          view: "store-options",
          icon: Settings,
          subItems: [
            { label: "Checklist", view: "store-options-checklist", icon: ClipboardList },
            { label: "Pricing", view: "store-options-pricing", icon: DollarSign },
            { label: "Billing", view: "store-options-billing", icon: CreditCard },
          ],
        },
      ];
    } else if (portalType === "cleaner") {
      return [
        { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
        { label: "Schedule", view: "schedule", icon: Calendar },
        { label: "Payments", view: "payments", icon: DollarSign },
        { label: "Requests", view: "requests", icon: CalendarOff },
      ];
    } else {
      return [
        { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
        { label: "Bookings", view: "bookings", icon: Package },
        { label: "Saved Cards", view: "payment-methods", icon: CreditCard },
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (view: string) => {
    // Special case for leads - check if we're on the leads route
    if (view === "leads") {
      return router.location.pathname === "/admin-portal/leads";
    }

    // Special case for bank transactions - check if we're on the bank-transactions route
    if (view === "bank-transactions") {
      return router.location.pathname === "/admin-portal/bank-transactions";
    }

    // Special case for dashboard - should only be active on the base admin portal route
    if (view === "dashboard") {
      // Check if we're on a dedicated sub-route (like leads or bank-transactions)
      const isOnDedicatedRoute =
        router.location.pathname === "/admin-portal/leads" ||
        router.location.pathname === "/admin-portal/bank-transactions";

      // If on a dedicated route, dashboard is not active
      if (isOnDedicatedRoute) {
        return false;
      }

      // Otherwise, check the search parameter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentView = (router.location.search as any).view || "dashboard";
      return currentView === "dashboard";
    }

    // For all other views, check the search parameter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentView = (router.location.search as any).view || "dashboard";
    return currentView === view;
  };

  const isParentActive = (item: NavItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => isActive(subItem.view));
  };

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out successfully");
    setIsMobileMenuOpen(false);
    navigate({ to: "/" });
  };

  const handleItemClick = (view: string) => {
    setIsMobileMenuOpen(false);
  };

  const handleExpandToggle = (view: string) => {
    setExpandedItem(expandedItem === view ? null : view);
  };

  // Handle mouse enter with immediate opening
  const handleMouseEnter = (view: string) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredParentView(view);
  };

  // Handle mouse leave with delayed closing
  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set a new timeout to close the menu after 300ms
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredParentView(null);
      hoverTimeoutRef.current = null;
    }, 300);
  };

  // For items with sub-items, get the target for the main icon (first sub-item)
  const getItemTarget = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      const firstSubItem = item.subItems[0];
      if (portalType === "admin") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { to: "/admin-portal" as const, search: { view: firstSubItem.view as any } };
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { to: "." as const, search: { view: firstSubItem.view as any } };
      }
    }

    // For items without sub-items
    if (portalType === "admin") {
      if (item.view === "leads") {
        return { to: "/admin-portal/leads" as const };
      } else if (item.view === "bank-transactions") {
        return { to: "/admin-portal/bank-transactions" as const };
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { to: "/admin-portal" as const, search: { view: item.view as any } };
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { to: "." as const, search: { view: item.view as any } };
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[50] p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle sidebar menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[40]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: Vertical pill design, Mobile: Full width drawer */}
      <aside
        className={`fixed top-0 left-0 h-screen z-[40] transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Desktop Pill Sidebar */}
        <div className="hidden lg:flex h-full w-20 bg-[#EAE9E3] flex-col items-center py-6 relative left-8">
          {/* Logo at the top */}
          <div className="mb-6 flex-shrink-0">
            <img
              src="/eco-clean-logo.png"
              alt="Verde Luxe Cleaning"
              className="w-14 h-14 object-contain"
            />
          </div>

          {/* Centered Pill Container with Navigation Icons */}
          <div className="flex-1 flex items-center justify-center w-full px-2">
            <nav className="bg-white rounded-[2.5rem] p-3 shadow-2xl flex flex-col items-center space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.view) || isParentActive(item);
                const target = getItemTarget(item);
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <div
                    key={item.view}
                    className="relative"
                    onMouseEnter={() => hasSubItems && handleMouseEnter(item.view)}
                    onMouseLeave={() => hasSubItems && handleMouseLeave()}
                  >
                    <Link
                      {...target}
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                        active
                          ? "bg-primary shadow-md"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleItemClick(item.view)}
                      title={item.label}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-700"}`} />
                    </Link>

                    {/* Sub-menu panel for items with children */}
                    {hasSubItems && hoveredParentView === item.view && (
                      <div
                        className="absolute left-full top-0 ml-4 z-[1000] transition-all duration-200 ease-out opacity-100 scale-100"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                      >
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px]">
                          {/* Parent label header */}
                          <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {item.label}
                            </p>
                          </div>

                          {/* Sub-items */}
                          <div className="py-1">
                            {item.subItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const subActive = isActive(subItem.view);

                              const subItemProps = portalType === "admin"
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ? { to: "/admin-portal" as const, search: { view: subItem.view as any } }
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                : { to: "." as const, search: { view: subItem.view as any } };

                              return (
                                <Link
                                  key={subItem.view}
                                  {...subItemProps}
                                  className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${
                                    subActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                  onClick={() => {
                                    handleItemClick(subItem.view);
                                    setHoveredParentView(null);
                                  }}
                                >
                                  <SubIcon className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm font-medium whitespace-nowrap">{subItem.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions - Outside the pill */}
          <div className="w-full flex flex-col items-center space-y-3 pt-4">
            {/* Help/Support */}
            <a
              href="mailto:contact@verdeluxecleaning.com"
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-all duration-200 shadow-md border border-gray-200"
              title="Help & Support"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </a>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-red-50 transition-all duration-200 shadow-md border border-gray-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        {/* Mobile Full Menu */}
        <div
          className={`lg:hidden w-80 h-full bg-white shadow-2xl border-r border-gray-200 overflow-y-auto flex flex-col ${
            isMobileMenuOpen ? "block" : "hidden"
          }`}
        >
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 font-heading mb-1">
              {portalType === "admin" && (user?.role === "OWNER" ? "Owner Portal" : "Admin Portal")}
              {portalType === "cleaner" && "Cleaner Portal"}
              {portalType === "client" && "Client Portal"}
            </h2>
            {user && (
              <p className="text-sm text-gray-600 truncate">
                {user.firstName || user.email}
              </p>
            )}
          </div>

          <nav className="px-4 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.view) || isParentActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedItem === item.view;

              return (
                <div key={item.view}>
                  {hasSubItems ? (
                    <>
                      <button
                        onClick={() => handleExpandToggle(item.view)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                          active
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.subItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const subActive = isActive(subItem.view);

                            const subItemProps = portalType === "admin"
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              ? { to: "/admin-portal" as const, search: { view: subItem.view as any } }
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              : { to: "." as const, search: { view: subItem.view as any } };

                            return (
                              <Link
                                key={subItem.view}
                                {...subItemProps}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                                  subActive
                                    ? "bg-primary text-white shadow-md"
                                    : "text-gray-600 hover:bg-gray-100"
                                }`}
                                onClick={() => handleItemClick(subItem.view)}
                              >
                                <SubIcon className="w-4 h-4 flex-shrink-0" />
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    (() => {
                      if (portalType === "admin") {
                        if (item.view === "leads") {
                          return (
                            <Link
                              to="/admin-portal/leads"
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                active
                                  ? "bg-primary text-white shadow-md"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                              onClick={() => handleItemClick(item.view)}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        } else if (item.view === "bank-transactions") {
                          return (
                            <Link
                              to="/admin-portal/bank-transactions"
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                active
                                  ? "bg-primary text-white shadow-md"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                              onClick={() => handleItemClick(item.view)}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        } else {
                          return (
                            <Link
                              to="/admin-portal"
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                search={{ view: item.view as any }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                  active
                                    ? "bg-primary text-white shadow-md"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                                onClick={() => handleItemClick(item.view)}
                              >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span>{item.label}</span>
                              </Link>
                            );
                          }
                        } else {
                          return (
                            <Link
                              to="."
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              search={{ view: item.view as any }}
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                active
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleItemClick(item.view)}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      }
                    })()
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile Bottom Actions */}
          <div className="px-4 pb-6 mt-auto">
            <div className="border-t border-gray-200 pt-4 space-y-2">
              {/* Help/Support */}
              <a
                href="mailto:contact@verdeluxecleaning.com"
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-100 transition-all duration-200"
              >
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                <span>Help & Support</span>
              </a>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
