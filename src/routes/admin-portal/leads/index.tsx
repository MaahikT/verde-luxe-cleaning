import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { PortalLayout } from "~/components/PortalLayout";
import { KanbanBoard } from "~/components/KanbanBoard";
import { LeadTable } from "~/components/LeadTable";
import { AdminBookingForm } from "~/components/AdminBookingForm";
import { Layers, XCircle, Loader, LayoutGrid, List, Search, Filter, X, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

const leadsSearchSchema = z.object({
  view: z.enum(["kanban", "list"]).default("kanban"),
  search: z.string().default(""),
  status: z.enum(["ALL", "INCOMING", "NO_RESPONSE", "HOT_LEAD", "PENDING_CALL_BACK", "OFFER_MADE"]).default("ALL"),
});

export const Route = createFileRoute("/admin-portal/leads/")({
  component: LeadsPage,
  validateSearch: zodValidator(leadsSearchSchema),
});

function LeadsPage() {
  const navigate = useNavigate({ from: "/admin-portal/leads" });
  const searchParams = Route.useSearch();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Redirect if not authenticated or not an admin/owner
  useEffect(() => {
    if (!token || !user) {
      toast.error("Please log in to access the leads page");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      toast.error("Access denied. Admin privileges required.");
      navigate({ to: "/" });
    }
  }, [token, user, navigate]);

  const leadsQuery = useQuery(
    trpc.getAllLeadsAdmin.queryOptions({
      authToken: token || "",
    })
  );

  const usersQuery = useQuery(
    trpc.getAllUsersAdmin.queryOptions({
      authToken: token || "",
    })
  );

  const createBookingMutation = useMutation(
    trpc.createBookingAdmin.mutationOptions({
      onSuccess: (data) => {
        if (data.generatedPassword) {
          toast.success(
            `Booking created! New client account created.\n\nTemporary Password: ${data.generatedPassword}\n\nPlease share this with the client. They can change it via "Forgot Password".`,
            {
              duration: 15000,
              style: {
                maxWidth: '500px',
                whiteSpace: 'pre-line',
              },
            }
          );
        } else {
          toast.success("Booking created successfully!");
        }
        setShowBookingForm(false);
        queryClient.invalidateQueries({ queryKey: trpc.getAllLeadsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create booking");
      },
    })
  );

  const createLeadMutation = useMutation(
    trpc.createLeadFromBooking.mutationOptions({
      onSuccess: () => {
        toast.success("Lead saved successfully!");
        setShowBookingForm(false);
        // Reset filters so the new lead is visible
        navigate({
          search: (prev) => ({ ...prev, status: "ALL", search: "" }),
        });
        queryClient.invalidateQueries({ queryKey: trpc.getAllLeadsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save lead");
      },
    })
  );

  const deleteLeadMutation = useMutation(
    trpc.deleteLeadAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Lead deleted successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getAllLeadsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lead");
      },
    })
  );



  const handleSaveAsLead = (data: any) => {
    // Fix date handling
    const scheduledDate = data.scheduledDate ? `${data.scheduledDate}T12:00:00.000Z` : undefined;

    createLeadMutation.mutate({
      authToken: token || "",
      ...data,
      scheduledDate,
    });
  };

  const updateLeadMutation = useMutation(
    trpc.updateLeadAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Lead updated successfully!");
        setShowBookingForm(false);
        setSelectedLead(null);
        queryClient.invalidateQueries({ queryKey: trpc.getAllLeadsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update lead");
      },
    })
  );

  const handleDeleteLead = (leadId: number) => {
    if (window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      deleteLeadMutation.mutate({
        authToken: token || "",
        leadId,
      });
    }
  };

  const handleEditLead = (lead: any) => {
    setSelectedLead(lead);
    setShowBookingForm(true);
  };

  const handleBookingFormSubmit = (data: any) => {
    // Fix date handling
    const scheduledDate = data.scheduledDate ? `${data.scheduledDate}T12:00:00.000Z` : undefined;

    if (selectedLead) {
      updateLeadMutation.mutate({
        authToken: token || "",
        leadId: selectedLead.id,
        ...data,
        scheduledDate,
      });
    } else {
      createBookingMutation.mutate({
        authToken: token || "",
        ...data,
        scheduledDate,
        overrideConflict: data.overrideConflict || false,
      });
    }
  };

  // Filter leads based on search params
  const filteredLeads = useMemo(() => {
    if (!leadsQuery.data?.leads) return [];

    let filtered = leadsQuery.data.leads;

    // Apply search filter
    if (searchParams.search) {
      const searchLower = searchParams.search.toLowerCase();
      filtered = filtered.filter((lead) => {
        const name = `${lead.firstName || ""} ${lead.lastName || ""}`.toLowerCase();
        const email = (lead.email || lead.user?.email || "").toLowerCase();
        const phone = (lead.phone || lead.user?.phone || "").toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
      });
    }

    // Apply status filter
    if (searchParams.status !== "ALL") {
      filtered = filtered.filter((lead) => lead.status === searchParams.status);
    }

    return filtered;
  }, [leadsQuery.data?.leads, searchParams.search, searchParams.status]);

  const updateSearchParams = (updates: Partial<z.infer<typeof leadsSearchSchema>>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    });
  };

  if (!token || !user) {
    return null;
  }

  const activeFiltersCount = (searchParams.search ? 1 : 0) + (searchParams.status !== "ALL" ? 1 : 0);

  return (
    <PortalLayout portalType="admin">
      <div className="bg-[#EAE9E3] min-h-screen">
        {/* Header Section */}
        <div className="bg-[#EAE9E3]">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-300">
                  <Layers className="w-7 h-7 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold font-heading text-gray-900">
                    Leads Pipeline
                  </h1>
                  <p className="mt-1 text-gray-700 text-sm">
                    Manage your sales pipeline
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedLead(null);
                    setShowBookingForm(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm hover:shadow-md border border-gray-300"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Booking/Lead</span>
                </button>
                {leadsQuery.data && (
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Total Leads:</span>
                    <span className="text-2xl font-bold text-gray-900">{leadsQuery.data.leads.length}</span>
                    {filteredLeads.length !== leadsQuery.data.leads.length && (
                      <span className="text-sm text-gray-700">
                        ({filteredLeads.length} filtered)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {leadsQuery.isLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Loader className="w-12 h-12 text-primary animate-spin" />
                <p className="text-gray-600 font-medium">Loading leads...</p>
              </div>
            </div>
          ) : leadsQuery.isError ? (
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <XCircle className="w-12 h-12 text-red-600" />
                <p className="text-red-900 font-semibold">Error loading leads</p>
                <p className="text-red-700 text-sm">{leadsQuery.error.message}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar with View Switcher and Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* View Switcher */}
                  <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                    <button
                      onClick={() => updateSearchParams({ view: "kanban" })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        searchParams.view === "kanban"
                          ? "bg-primary text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Kanban</span>
                    </button>
                    <button
                      onClick={() => updateSearchParams({ view: "list" })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        searchParams.view === "list"
                          ? "bg-primary text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>List</span>
                    </button>
                  </div>

                  {/* Filter Badge */}
                  {activeFiltersCount > 0 && (
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-medium">
                      <Filter className="w-4 h-4" />
                      <span>{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active</span>
                      <button
                        onClick={() => updateSearchParams({ search: "", status: "ALL" })}
                        className="ml-1 hover:bg-primary/20 rounded p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchParams.search}
                        onChange={(e) => updateSearchParams({ search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      {searchParams.search && (
                        <button
                          onClick={() => updateSearchParams({ search: "" })}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="sm:w-64">
                    <select
                      value={searchParams.status}
                      onChange={(e) => updateSearchParams({ status: e.target.value as any })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="INCOMING">Incoming</option>
                      <option value="NO_RESPONSE">No Response</option>
                      <option value="HOT_LEAD">Hot Leads</option>
                      <option value="PENDING_CALL_BACK">Pending Call Back</option>
                      <option value="OFFER_MADE">Offers Made</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              {filteredLeads.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <Layers className="w-10 h-10 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-lg mb-1">
                        {leadsQuery.data.leads.length === 0 ? "No Leads Yet" : "No Leads Found"}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {leadsQuery.data.leads.length === 0
                          ? "Leads from your contact form will appear here"
                          : "Try adjusting your filters"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : searchParams.view === "kanban" ? (
                <div className="bg-gray-100/50 rounded-xl shadow-sm border border-gray-200 p-4">
                  <KanbanBoard leads={filteredLeads} onDeleteLead={handleDeleteLead} onEditLead={handleEditLead} />
                </div>
              ) : (
                <LeadTable leads={filteredLeads} onDelete={handleDeleteLead} onEdit={handleEditLead} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Booking/Lead Form Modal */}
      {showBookingForm && usersQuery.data && (
        <AdminBookingForm
          clients={usersQuery.data.users.filter((u) => u.role === "CLIENT")}
          cleaners={usersQuery.data.users.filter((u) => u.role === "CLEANER")}
          onSubmit={handleBookingFormSubmit}
          onSaveAsLead={handleSaveAsLead}
          onCancel={() => {
            setShowBookingForm(false);
            setSelectedLead(null);
          }}
          isSubmitting={createBookingMutation.isPending || createLeadMutation.isPending || updateLeadMutation.isPending}
          mode="lead"
          booking={
            selectedLead
              ? (() => {
                  try {
                    // Start with basic lead info
                    const baseInfo = {
                      id: selectedLead.id,
                      clientId: selectedLead.userId || 0,
                      cleanerId: null, // Leads don't have cleaners assigned yet usually
                      address: "",
                      serviceType: "",
                      scheduledDate: "",
                      scheduledTime: "",
                      durationHours: null,
                      specialInstructions: "",
                      finalPrice: null,
                      serviceFrequency: null,
                      houseSquareFootage: null,
                      basementSquareFootage: null,
                      numberOfBedrooms: null,
                      numberOfBathrooms: null,
                      numberOfCleanersRequested: null,
                      cleanerPaymentAmount: null,
                      paymentMethod: "NEW_CREDIT_CARD",
                      paymentDetails: null,
                      selectedExtras: null,
                      clientEmail: selectedLead.email,
                      clientFirstName: selectedLead.firstName,
                      clientLastName: selectedLead.lastName,
                      clientPhone: selectedLead.phone,
                    };

                    // Try to parse booking details from message
                    // Format is "Special Instructions: ...\n\nBooking Details:\n{...}"
                    const message = selectedLead.message || "";
                    const jsonMatch = message.match(/Booking Details:\n(\{[\s\S]*\})/);

                    if (jsonMatch && jsonMatch[1]) {
                      const details = JSON.parse(jsonMatch[1]);
                      // Merge details into baseInfo
                      return { ...baseInfo, ...details };
                    }

                    // If parsing fails, return base info with description as special instructions
                    return { ...baseInfo, specialInstructions: message };
                  } catch (e) {
                    console.error("Failed to parse lead details", e);
                    return undefined;
                  }
                })()
              : undefined
          }
        />
      )}
    </PortalLayout>
  );
}
