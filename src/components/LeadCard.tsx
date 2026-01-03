import { Mail, Phone, MessageSquare, User, Trash2 } from "lucide-react";
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

interface LeadCardProps {
  lead: Lead;
  onDragStart: (e: React.DragEvent, leadId: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

export function LeadCard({ lead, onDragStart, onDragEnd, onDelete, onEdit, onConvert }: LeadCardProps & { onDelete?: (leadId: number) => void }) {
  const displayName = lead.firstName && lead.lastName
    ? `${lead.firstName} ${lead.lastName}`
    : lead.user?.firstName && lead.user?.lastName
    ? `${lead.user.firstName} ${lead.user.lastName}`
    : "Unknown";

  const displayEmail = lead.email || lead.user?.email || "No email";
  const displayPhone = lead.phone || lead.user?.phone || "No phone";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className="bg-white rounded-md border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-move group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-semibold text-gray-900 text-sm truncate">
            {displayName}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConvert(lead);
            }}
            className="p-1.5 hover:bg-green-50 rounded-md text-gray-400 hover:text-green-600 transition-colors"
            title="Convert to Booking"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-primary transition-colors"
            title="Edit Lead"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(lead.id);
              }}
              className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="truncate">{displayEmail}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="truncate">{displayPhone === "No phone" ? displayPhone : formatPhoneNumber(displayPhone)}</span>
        </div>
      </div>

      {/* Message Preview */}
      {lead.message && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 line-clamp-2">
              {lead.message}
            </p>
          </div>
        </div>
      )}

      {/* How they heard about us */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Source:</span> {lead.howHeardAbout}
        </p>
      </div>

      {/* Date */}
      <div className="mt-2">
        <p className="text-xs text-gray-400">
          {new Date(lead.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
