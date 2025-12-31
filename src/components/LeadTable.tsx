import { Mail, Phone, MessageSquare, User, ArrowUpDown, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

interface Lead {
  id: number;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string;
  howHeardAbout: string;
  message: string | null;
  createdAt: Date;
  status: string;
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  } | null;
}

interface LeadTableProps {
  leads: Lead[];
  onDelete?: (leadId: number) => void;
  onEdit: (lead: Lead) => void;
}

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  INCOMING: { label: "Incoming", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  NO_RESPONSE: { label: "No Response", bgColor: "bg-gray-100", textColor: "text-gray-800" },
  HOT_LEAD: { label: "Hot Lead", bgColor: "bg-red-100", textColor: "text-red-800" },
  PENDING_CALL_BACK: { label: "Pending Call Back", bgColor: "bg-green-100", textColor: "text-green-800" },
  OFFER_MADE: { label: "Offer Made", bgColor: "bg-primary/10", textColor: "text-primary" },
};

export function LeadTable({ leads, onDelete, onEdit }: LeadTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Lead | "name" | "status";
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });

  const handleSort = (key: keyof Lead | "name" | "status") => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let compareValue = 0;

    if (sortConfig.key === "name") {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
      compareValue = nameA.localeCompare(nameB);
    } else if (sortConfig.key === "createdAt") {
      compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortConfig.key === "status") {
      compareValue = a.status.localeCompare(b.status);
    } else {
      const aValue = a[sortConfig.key as keyof Lead];
      const bValue = b[sortConfig.key as keyof Lead];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        compareValue = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        compareValue = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        compareValue = aValue.getTime() - bValue.getTime();
      } else {
        if (aValue === null && bValue !== null) compareValue = -1;
        else if (aValue !== null && bValue === null) compareValue = 1;
        else if (aValue === null && bValue === null) compareValue = 0;
        else compareValue = String(aValue).localeCompare(String(bValue));
      }
    }

    return sortConfig.direction === "asc" ? compareValue : -compareValue;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("name")}>
                Client
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("status")}>
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("createdAt")}>
                Date Added
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedLeads.map((lead) => {
              const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.INCOMING;

              const displayName = lead.firstName && lead.lastName
                ? `${lead.firstName} ${lead.lastName}`
                : lead.user?.firstName && lead.user?.lastName
                ? `${lead.user.firstName} ${lead.user.lastName}`
                : "Unknown";

              const displayEmail = lead.email || lead.user?.email || "No email";
              const displayPhone = lead.phone || lead.user?.phone || "No phone";

              return (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{displayName}</div>
                        <div className="text-xs text-gray-500">{displayEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(lead.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{lead.howHeardAbout}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button
                        onClick={() => onEdit(lead)}
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors hover:bg-gray-100 rounded-md"
                        title="Edit Lead"
                      >
                         <Pencil className="w-4 h-4" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-md"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedLeads.length === 0 && (
        <div className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg mb-1">No Leads Found</p>
              <p className="text-gray-600 text-sm">
                Try adjusting your filters
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
