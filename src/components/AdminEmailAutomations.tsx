import { useState, Fragment } from "react";
import { Mail, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronUp, Code, Check, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import toast from "react-hot-toast";
import { useAuthStore } from "~/stores/authStore";
import { Tab, Switch, Dialog, Transition } from "@headlessui/react";
import { EmailRecipientType, EmailEventCategory } from "@prisma/client";

const RECIPIENT_TABS = [
  { label: "Admin", value: EmailRecipientType.ADMIN },
  { label: "Customer", value: EmailRecipientType.CUSTOMER },
  { label: "Cleaner", value: EmailRecipientType.CLEANER },
];

const CATEGORY_LABELS: Record<string, string> = {
  [EmailEventCategory.ACCOUNT]: "Account",
  [EmailEventCategory.GENERAL]: "General",
  [EmailEventCategory.BOOKING_NEW_MODIFIED]: "New & Modified Booking",
  [EmailEventCategory.BOOKING_CANCELED_POSTPONED]: "Canceled & Postponed Booking",
  [EmailEventCategory.BOOKING_UNASSIGNED]: "Unassigned Booking",
  [EmailEventCategory.REMINDERS]: "Reminders",
};

const SHORT_CODES = [
  { code: "{{customer_first_name}}", desc: "Customer's first name" },
  { code: "{{customer_last_name}}", desc: "Customer's last name" },
  { code: "{{cleaner_first_name}}", desc: "Cleaner's first name" },
  { code: "{{service_type}}", desc: "Type of service (e.g. Standard Cleaning)" },
  { code: "{{scheduled_date}}", desc: "Date of the booking" },
  { code: "{{scheduled_time}}", desc: "Time of the booking" },
  { code: "{{address}}", desc: "Service address" },
  { code: "{{booking_link}}", desc: "Link to booking details" },
];

export function AdminEmailAutomations() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedRecipient, setSelectedRecipient] = useState<EmailRecipientType>(EmailRecipientType.ADMIN);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    [EmailEventCategory.BOOKING_NEW_MODIFIED]: true, // Default open
  });
  const [isShortCodesOpen, setIsShortCodesOpen] = useState(false);

  // Edit State
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const templatesQuery = useQuery(
    trpc.emailTemplates.list.queryOptions({ authToken: token! }, { enabled: !!token })
  );

  const ensureDefaultsMutation = useMutation(
    trpc.emailTemplates.ensureDefaults.mutationOptions({
      onSuccess: (data) => {
        if (data.seeded > 0) {
          toast.success(`Seeded ${data.seeded} default templates`);
          queryClient.invalidateQueries({ queryKey: [["emailTemplates", "list"]] });
        }
      },
    })
  );

  const updateMutation = useMutation(
    trpc.emailTemplates.update.mutationOptions({
      onSuccess: () => {
        toast.success("Template saved");
        queryClient.invalidateQueries({ queryKey: [["emailTemplates", "list"]] });
        setEditingTemplate(null);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  // Auto-seed if empty (and loaded)
  if (templatesQuery.data && templatesQuery.data.templates.length === 0 && !templatesQuery.isLoading && !ensureDefaultsMutation.isPending && !ensureDefaultsMutation.isSuccess) {
     ensureDefaultsMutation.mutate({ authToken: token! });
  }

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Test Email State
  const [testEmailTemplate, setTestEmailTemplate] = useState<any>(null);

  const sendTestMutation = useMutation(
    trpc.emailTemplates.sendTestEmail.mutationOptions({
      onSuccess: () => {
        toast.success("Test email sent successfully");
        setTestEmailTemplate(null);
      },
      onError: (err) => toast.error(`Failed to send test: ${err.message}`),
    })
  );

  const handleToggleActive = (template: any) => {
    updateMutation.mutate({
      authToken: token!,
      id: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      recipient: template.recipient,
      category: template.category,
      event: template.event,
      isActive: !template.isActive,
    });
  };

  const activeTemplates = templatesQuery.data?.templates.filter(t => t.recipient === selectedRecipient) || [];

  // Group by category
  const groupedTemplates = activeTemplates.reduce((acc, t) => {
    const cat = t.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, typeof activeTemplates>);

  // Render content
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">Email Automations</h2>
            <p className="text-sm text-gray-500">Configure automated email notifications</p>
          </div>
        </div>
        <button
          onClick={() => setIsShortCodesOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm"
        >
          <Code className="w-4 h-4" />
          View Short Codes
        </button>
      </div>

      <Tab.Group
        selectedIndex={RECIPIENT_TABS.findIndex(t => t.value === selectedRecipient)}
        onChange={(idx) => setSelectedRecipient(RECIPIENT_TABS[idx]!.value)}
      >
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 max-w-md">
          {RECIPIENT_TABS.map((tab) => (
            <Tab
              key={tab.value}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                 ${selected
                   ? 'bg-white text-primary shadow'
                   : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-700'}`
              }
            >
              {tab.label}
            </Tab>
          ))}
        </Tab.List>
      </Tab.Group>

      {/* Loading State */}
      {templatesQuery.isLoading && (
         <div className="py-12 text-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
           <p className="text-gray-500">Loading configurations...</p>
         </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {Object.keys(CATEGORY_LABELS).map((catKey) => {
           const templates = groupedTemplates[catKey];
           // Only show sections that have templates? Or show all? User requirements: "Group notifications..."
           // If we have no templates for a category, maybe hiding it is cleaner, but showing it allows creating?
           // Current system is predefined templates, so if none exist, we can't create them easily without a generic "create" button, which we removed in favor of seeding.
           // So, hide empty categories.
           if (!templates || templates.length === 0) return null;

           const isOpen = openCategories[catKey];

           return (
             <div key={catKey} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
               <button
                 onClick={() => toggleCategory(catKey)}
                 className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
               >
                 <span className="font-semibold text-gray-800">{CATEGORY_LABELS[catKey] || catKey}</span>
                 {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
               </button>

               {isOpen && (
                 <div className="divide-y divide-gray-100">
                   {templates.map(template => (
                     <div key={template.id} className="p-6">
                       {editingTemplate?.id === template.id ? (
                         <EditTemplateForm
                           template={editingTemplate}
                           onCancel={() => setEditingTemplate(null)}
                           onSave={(data) => updateMutation.mutate({ ...data, authToken: token! })}
                           isSaving={updateMutation.isPending}
                         />
                       ) : (
                         <div className="flex items-start justify-between gap-4">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                               <h3 className="font-medium text-gray-900">{template.name}</h3>
                               {template.description && (
                                 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                   {template.description}
                                 </span>
                               )}
                             </div>
                             <p className="text-sm text-gray-600 mb-2 font-medium">Subject: <span className="font-normal">{template.subject}</span></p>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-600 font-mono line-clamp-2">
                               {template.body}
                             </div>
                           </div>

                           <div className="flex items-center gap-4">
                             <div className="flex flex-col items-center gap-1">
                               <Switch
                                 checked={template.isActive}
                                 onChange={() => handleToggleActive(template)}
                                 className={`${
                                   template.isActive ? 'bg-primary' : 'bg-gray-200'
                                 } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                               >
                                 <span
                                   className={`${
                                     template.isActive ? 'translate-x-6' : 'translate-x-1'
                                   } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                 />
                               </Switch>
                               <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                 {template.isActive ? "On" : "Off"}
                               </span>
                             </div>

                              <button
                                onClick={() => setTestEmailTemplate(template)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Send Test Email"
                              >
                                <Send className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setEditingTemplate(template)}
                                className="p-2 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                                title="Edit Template"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            </div>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )}
             </div>
           );
        })}
      </div>

      {/* Short Codes Modal */}
      <Transition appear show={isShortCodesOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsShortCodesOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                    Available Short Codes
                    <button onClick={() => setIsShortCodesOpen(false)} className="text-gray-400 hover:text-gray-500">
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Title>
                  <div className="mt-4">
                    <div className="space-y-3">
                      {SHORT_CODES.map((item) => (
                        <div key={item.code} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary-200 transition-colors group">
                          <div>
                            <code className="text-sm font-bold text-primary bg-primary-50 px-2 py-1 rounded">{item.code}</code>
                            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                          </div>
                          <button
                             onClick={() => {
                               navigator.clipboard.writeText(item.code);
                               toast.success("Copied to clipboard");
                             }}
                             className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-primary font-medium"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>


      <TestEmailModal
        isOpen={!!testEmailTemplate}
        onClose={() => setTestEmailTemplate(null)}
        templateName={testEmailTemplate?.name || ""}
        onSend={(email) => {
           sendTestMutation.mutate({
             authToken: token!,
             templateId: testEmailTemplate.id,
             to: email
           });
        }}
        isSending={sendTestMutation.isPending}
      />
    </div>
  );
}

function TestEmailModal({ isOpen, onClose, templateName, onSend, isSending }: {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  onSend: (email: string) => void;
  isSending: boolean;
}) {
  const [email, setEmail] = useState("");

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Send Test: {templateName}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Enter an email address to send a preview of this template. Placeholders will be replaced with dummy data.
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium disabled:opacity-50"
                    onClick={() => onSend(email)}
                    disabled={!email || isSending}
                  >
                   {isSending ? "Sending..." : "Send Test"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function EditTemplateForm({ template, onCancel, onSave, isSaving }: {
  template: any;
  onCancel: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    name: template.name,
    subject: template.subject,
    body: template.body,
  });

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById("edit-email-body") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      setFormData({ ...formData, body: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-blue-100">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-gray-900">Editing: {template.name}</h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">Body</label>
          <div className="text-xs text-gray-500">Use short codes below</div>
        </div>
        <textarea
          id="edit-email-body"
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          rows={8}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm leading-relaxed"
        />
        {/* Quick Insert Bar */}
        <div className="mt-2 flex flex-wrap gap-2">
           {SHORT_CODES.slice(0, 4).map(sc => (
             <button
               key={sc.code}
               type="button"
               onClick={() => insertPlaceholder(sc.code)}
               className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 text-gray-600"
             >
               {sc.code}
             </button>
           ))}
           <button type="button" className="text-xs text-primary underline ml-1" onClick={() => (document.querySelector('button[class*="View Short Codes"]') as HTMLElement)?.click()}>View All</button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({
            id: template.id,
            ...formData,
            recipient: template.recipient,
            category: template.category,
            event: template.event
          })}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
