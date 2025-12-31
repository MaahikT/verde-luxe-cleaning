import { useState } from "react";
import { DollarSign, CreditCard, XCircle, CheckCircle } from "lucide-react";
import { AdminPendingChargesTab } from "~/components/AdminPendingChargesTab";
import { AdminCardHoldsTab } from "~/components/AdminCardHoldsTab";
import { AdminDeclinedChargesTab } from "~/components/AdminDeclinedChargesTab";
import { AdminAllChargesTab } from "~/components/AdminAllChargesTab";

type TabType = "pending" | "holds" | "declined" | "all";

export function AdminBookingChargesTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("pending");

  const tabs = [
    {
      id: "pending" as TabType,
      label: "Pending Charges",
      icon: DollarSign,
      description: "Completed bookings ready to charge",
    },
    {
      id: "holds" as TabType,
      label: "Card Hold(s)",
      icon: CreditCard,
      description: "Active holds for upcoming bookings",
    },
    {
      id: "declined" as TabType,
      label: "Declined Charges",
      icon: XCircle,
      description: "Failed or canceled charges",
    },
    {
      id: "all" as TabType,
      label: "All Charges",
      icon: CheckCircle,
      description: "Completed charges with refund options",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-heading">Booking Charges</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Manage payments, holds, and refunds for all bookings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[200px] px-6 py-4 text-left transition-all duration-200 border-b-2 ${
                    isActive
                      ? "border-primary bg-white"
                      : "border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? "text-primary" : "text-gray-400"
                      }`}
                    />
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          isActive ? "text-primary" : "text-gray-700"
                        }`}
                      >
                        {tab.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "pending" && <AdminPendingChargesTab />}
          {activeTab === "holds" && <AdminCardHoldsTab />}
          {activeTab === "declined" && <AdminDeclinedChargesTab />}
          {activeTab === "all" && <AdminAllChargesTab />}
        </div>
      </div>
    </div>
  );
}
