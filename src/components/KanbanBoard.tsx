import { useState } from "react";
import { KanbanColumn } from "~/components/KanbanColumn";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

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

const COLUMNS = [
  { status: "INCOMING", title: "Incoming", color: "#7C9A92" }, // Soft teal-green
  { status: "NO_RESPONSE", title: "No Response", color: "#9CA3AF" }, // Muted gray
  { status: "HOT_LEAD", title: "Hot Leads", color: "#DC8A78" }, // Soft coral
  { status: "PENDING_CALL_BACK", title: "Pending Call Back", color: "#8BA888" }, // Soft sage green
  { status: "OFFER_MADE", title: "Offers Made", color: "#163022" }, // Primary brand color
];

interface KanbanBoardProps {
  leads: Lead[];
  onDeleteLead: (leadId: number) => void;
  onEditLead: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onDeleteLead, onEditLead }: KanbanBoardProps) {
  const trpc = useTRPC();
  const [activeId, setActiveId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const updateLeadStatusMutation = useMutation(
    trpc.updateLeadStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Lead status updated!");
        queryClient.invalidateQueries({ queryKey: trpc.getAllLeadsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update lead status");
      },
    })
  );

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLeadId) return;

    const lead = leads.find((l) => l.id === draggedLeadId);
    if (!lead) return;

    // Don't update if dropped in the same column
    if (lead.status === newStatus) {
      setDraggedLeadId(null);
      return;
    }

    // Update lead status
    updateLeadStatusMutation.mutate({
      authToken: token || "",
      inquiryId: draggedLeadId,
      status: newStatus as any,
    });

    setDraggedLeadId(null);
  };

  const handleColumnDragOver = (status: string) => {
    setDragOverColumn(status);
  };

  // Group leads by status
  const leadsByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.status] = leads.filter((lead) => lead.status === column.status);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="flex gap-3 w-full">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          id={column.status}
          title={column.title}
          leads={leadsByStatus[column.status] || []}
          status={column.status}
          color={column.color}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            handleDragOver(e);
            handleColumnDragOver(column.status);
          }}
          onDrop={handleDrop}
          isDraggingOver={dragOverColumn === column.status}
          onDelete={onDeleteLead}
          onEdit={onEditLead}
        />
      ))}
    </div>
  );
}
