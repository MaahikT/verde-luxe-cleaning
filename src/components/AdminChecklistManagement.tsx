import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  X,
  ClipboardList,
  GripVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const checklistTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  serviceType: z.string().min(1, "Service type is required"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Item description is required"),
      })
    )
    .min(1, "At least one checklist item is required"),
});

type ChecklistTemplateFormData = z.infer<typeof checklistTemplateSchema>;

interface ChecklistTemplate {
  id: number;
  name: string;
  serviceType: string;
  createdAt: Date;
  items: {
    id: number;
    description: string;
    order: number;
  }[];
}

export function AdminChecklistManagement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | undefined>();

  const templatesQuery = useQuery(
    trpc.getChecklistTemplates.queryOptions({
      authToken: token || "",
    })
  );

  const createMutation = useMutation(
    trpc.createChecklistTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist template created successfully!");
        setShowForm(false);
        setSelectedTemplate(undefined);
        queryClient.invalidateQueries({ queryKey: trpc.getChecklistTemplates.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create template");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateChecklistTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist template updated successfully!");
        setShowForm(false);
        setSelectedTemplate(undefined);
        queryClient.invalidateQueries({ queryKey: trpc.getChecklistTemplates.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update template");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteChecklistTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist template deleted successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getChecklistTemplates.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete template");
      },
    })
  );

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setShowForm(true);
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    setShowForm(true);
  };

  const handleDelete = (templateId: number, templateName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${templateName}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate({
        authToken: token || "",
        templateId,
      });
    }
  };

  const handleFormSubmit = (data: ChecklistTemplateFormData) => {
    const items = data.items.map((item, index) => ({
      description: item.description,
      order: index,
    }));

    if (selectedTemplate) {
      updateMutation.mutate({
        authToken: token || "",
        templateId: selectedTemplate.id,
        name: data.name,
        serviceType: data.serviceType,
        items,
      });
    } else {
      createMutation.mutate({
        authToken: token || "",
        name: data.name,
        serviceType: data.serviceType,
        items,
      });
    }
  };

  const serviceTypes = [
    "Standard Home Cleaning",
    "Deep Home Cleaning",
    "Move-In/Out Cleaning",
    "Vacation Rental Cleaning",
    "Commercial Cleaning",
    "Post Construction Cleaning",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-heading">
            Checklist Templates
          </h2>
          <p className="text-gray-600 mt-1">
            Create and manage cleaning checklists for different service types
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create Template
        </button>
      </div>

      {/* Templates List */}
      {templatesQuery.isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading templates...</p>
          </div>
        </div>
      ) : templatesQuery.isError ? (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading templates</p>
          </div>
        </div>
      ) : templatesQuery.data?.templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <ClipboardList className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg mb-1">
                No Templates Yet
              </p>
              <p className="text-gray-600 text-sm">
                Create your first checklist template to get started
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templatesQuery.data?.templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Template Header */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 truncate">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.serviceType}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete template"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Template Items */}
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Checklist Items ({template.items.length})
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {template.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-2"
                    >
                      <span className="text-xs font-semibold text-gray-400 mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="flex-1">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ChecklistTemplateForm
          template={selectedTemplate}
          serviceTypes={serviceTypes}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedTemplate(undefined);
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

interface ChecklistTemplateFormProps {
  template?: ChecklistTemplate;
  serviceTypes: string[];
  onSubmit: (data: ChecklistTemplateFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function ChecklistTemplateForm({
  template,
  serviceTypes,
  onSubmit,
  onCancel,
  isSubmitting,
}: ChecklistTemplateFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ChecklistTemplateFormData>({
    resolver: zodResolver(checklistTemplateSchema),
    defaultValues: template
      ? {
          name: template.name,
          serviceType: template.serviceType,
          items: template.items.map((item) => ({
            description: item.description,
          })),
        }
      : {
          name: "",
          serviceType: "",
          items: [{ description: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 sticky top-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {template ? "Edit Template" : "Create Template"}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., Standard Cleaning Checklist"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register("serviceType")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a service type</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.serviceType && (
              <p className="mt-1 text-sm text-red-600">
                {errors.serviceType.message}
              </p>
            )}
          </div>

          {/* Checklist Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Checklist Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => append({ description: "" })}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex items-center justify-center w-8 h-10 text-gray-400">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register(`items.${index}.description`)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={`Item ${index + 1}`}
                    />
                    {errors.items?.[index]?.description && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.items && (
              <p className="mt-2 text-sm text-red-600">
                {errors.items.message || "Please add at least one item"}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving..."
                : template
                ? "Update Template"
                : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
