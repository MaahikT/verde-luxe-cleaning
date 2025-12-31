import { LeadCard } from "~/components/LeadCard";

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

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  status: string;
  color: string;
  onDragStart: (e: React.DragEvent, leadId: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  isDraggingOver: boolean;
  onDelete: (leadId: number) => void;
  onEdit: (lead: any) => void;
}

export function KanbanColumn({
  id,
  title,
  leads,
  status,
  color,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDraggingOver,
  onDelete,
  onEdit,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full flex-1 min-w-0">
      {/* Column Header */}
      <div
        className="rounded-t-lg px-3 py-3 shadow-sm"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
          <span className="bg-white/30 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, status)}
        className={`flex-1 bg-gray-50/50 rounded-b-lg p-2 space-y-2 overflow-y-auto border-2 border-t-0 transition-all duration-200 ${
          isDraggingOver
            ? "border-primary bg-primary/5 border-dashed"
            : "border-gray-200"
        }`}
        style={{ minHeight: "400px", maxHeight: "calc(100vh - 200px)" }}
      >
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p className="text-xs font-medium">No leads</p>
            <p className="text-[10px] mt-1">Drag leads here</p>
          </div>
        ) : (
          <div className="space-y-3 min-h-[100px]">
            {leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
