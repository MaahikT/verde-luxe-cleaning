import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import {
  Plus,
  Edit,
  Trash2,
  X,
  DollarSign,
  Clock,
  Home,
  Bed,
  Bath,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface PricingRule {
  id: number;
  name: string;
  ruleType: string;
  serviceType: string | null;
  priceAmount: number | null;
  ratePerUnit: number | null;
  timeAmount: number | null;
  timePerUnit: number | null;
  extraName: string | null;
  extraDescription: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const pricingRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ruleType: z.enum(["BASE_PRICE", "SQFT_RATE", "BEDROOM_RATE", "BATHROOM_RATE", "EXTRA_SERVICE", "TIME_ESTIMATE"]),
  serviceType: z.string().optional(),
  priceAmount: z.number().positive().optional(),
  ratePerUnit: z.number().positive().optional(),
  timeAmount: z.number().positive().optional(),
  timePerUnit: z.number().positive().optional(),
  extraName: z.string().optional(),
  extraDescription: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

type PricingRuleFormData = z.infer<typeof pricingRuleSchema>;

const SERVICE_TYPES = [
  "Standard Home Cleaning",
  "Deep Home Cleaning",
  "Vacation Rental Cleaning",
  "Commercial Cleaning",
  "Move-In/Out Cleaning",
  "Post Construction Cleaning",
];

const RULE_TYPE_LABELS: Record<string, string> = {
  BASE_PRICE: "Base Price",
  SQFT_RATE: "Square Footage Rate",
  BEDROOM_RATE: "Bedroom Rate",
  BATHROOM_RATE: "Bathroom Rate",
  EXTRA_SERVICE: "Extra Service",
  TIME_ESTIMATE: "Time Estimate",
};

const RULE_TYPE_ICONS: Record<string, any> = {
  BASE_PRICE: DollarSign,
  SQFT_RATE: Home,
  BEDROOM_RATE: Bed,
  BATHROOM_RATE: Bath,
  EXTRA_SERVICE: Package,
  TIME_ESTIMATE: Clock,
};

interface PricingRuleFormProps {
  rule?: PricingRule;
  onSubmit: (data: PricingRuleFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function PricingRuleForm({ rule, onSubmit, onCancel, isSubmitting }: PricingRuleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PricingRuleFormData>({
    resolver: zodResolver(pricingRuleSchema) as any,
    defaultValues: (rule
      ? {
          name: rule.name,
          ruleType: rule.ruleType as any,
          serviceType: rule.serviceType || undefined,
          priceAmount: rule.priceAmount || undefined,
          ratePerUnit: rule.ratePerUnit || undefined,
          timeAmount: rule.timeAmount || undefined,
          timePerUnit: rule.timePerUnit || undefined,
          extraName: rule.extraName || undefined,
          extraDescription: rule.extraDescription || undefined,
          isActive: rule.isActive,
          displayOrder: rule.displayOrder,
        }
      : {
          name: "",
          ruleType: "BASE_PRICE",
          isActive: true,
          displayOrder: 0,
        }) as any,
  });

  const ruleType = watch("ruleType");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 sticky top-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {rule ? "Edit Pricing Rule" : "Create Pricing Rule"}
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
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., Standard Cleaning Base Price"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Rule Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rule Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register("ruleType")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a rule type</option>
              {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.ruleType && (
              <p className="mt-1 text-sm text-red-600">{errors.ruleType.message}</p>
            )}
          </div>

          {/* Service Type (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type (Optional)
            </label>
            <select
              {...register("serviceType")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Service Types</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to apply to all service types
            </p>
          </div>

          {/* Conditional fields based on rule type */}
          {ruleType === "BASE_PRICE" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("priceAmount", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 100.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Time (hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  {...register("timeAmount", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 2.0"
                />
              </div>
            </>
          )}

          {(ruleType === "SQFT_RATE" || ruleType === "BEDROOM_RATE" || ruleType === "BATHROOM_RATE") && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Unit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("ratePerUnit", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 0.10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time per Unit (hours)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("timePerUnit", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 0.001"
                />
              </div>
            </>
          )}

          {ruleType === "EXTRA_SERVICE" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra Service Name
                </label>
                <input
                  type="text"
                  {...register("extraName")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Oven Cleaning"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register("extraDescription")}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description of the extra service"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("priceAmount", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 25.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Time (hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  {...register("timeAmount", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 0.5"
                />
              </div>
            </>
          )}

          {ruleType === "TIME_ESTIMATE" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Time (hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  {...register("timeAmount", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 2.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time per Sq Ft (hours)
                </label>
                <input
                  type="number"
                  step="0.001"
                  {...register("timePerUnit", { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 0.001"
                />
              </div>
            </>
          )}

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register("isActive")}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label className="text-sm font-medium text-gray-700">
              Active (rule will be applied to calculations)
            </label>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              {...register("displayOrder", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lower numbers appear first
            </p>
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
              {isSubmitting ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminPricingManagement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | undefined>();

  const pricingRulesQuery = useQuery(
    trpc.getPricingRules.queryOptions({
      authToken: token || "",
    })
  );

  const createRuleMutation = useMutation(
    trpc.createPricingRule.mutationOptions({
      onSuccess: () => {
        toast.success("Pricing rule created successfully!");
        setShowForm(false);
        queryClient.invalidateQueries({ queryKey: trpc.getPricingRules.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create pricing rule");
      },
    })
  );

  const updateRuleMutation = useMutation(
    trpc.updatePricingRule.mutationOptions({
      onSuccess: () => {
        toast.success("Pricing rule updated successfully!");
        setShowForm(false);
        setSelectedRule(undefined);
        queryClient.invalidateQueries({ queryKey: trpc.getPricingRules.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update pricing rule");
      },
    })
  );

  const deleteRuleMutation = useMutation(
    trpc.deletePricingRule.mutationOptions({
      onSuccess: () => {
        toast.success("Pricing rule deleted successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getPricingRules.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete pricing rule");
      },
    })
  );

  const handleCreateRule = () => {
    setSelectedRule(undefined);
    setShowForm(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setSelectedRule(rule);
    setShowForm(true);
  };

  const handleDeleteRule = (ruleId: number, ruleName: string) => {
    if (window.confirm(`Are you sure you want to delete "${ruleName}"? This action cannot be undone.`)) {
      deleteRuleMutation.mutate({
        authToken: token || "",
        ruleId,
      });
    }
  };

  const handleFormSubmit = (data: PricingRuleFormData) => {
    if (selectedRule) {
      // Update existing rule
      updateRuleMutation.mutate({
        authToken: token || "",
        ruleId: selectedRule.id,
        ...data,
        serviceType: data.serviceType || null,
        priceAmount: data.priceAmount || null,
        ratePerUnit: data.ratePerUnit || null,
        timeAmount: data.timeAmount || null,
        timePerUnit: data.timePerUnit || null,
        extraName: data.extraName || null,
        extraDescription: data.extraDescription || null,
      });
    } else {
      // Create new rule
      createRuleMutation.mutate({
        authToken: token || "",
        ...data,
        serviceType: data.serviceType || null,
        priceAmount: data.priceAmount || null,
        ratePerUnit: data.ratePerUnit || null,
        timeAmount: data.timeAmount || null,
        timePerUnit: data.timePerUnit || null,
        extraName: data.extraName || null,
        extraDescription: data.extraDescription || null,
      });
    }
  };

  // Group rules by type
  const groupedRules: Record<string, PricingRule[]> = {};
  pricingRulesQuery.data?.pricingRules.forEach((rule) => {
    if (!groupedRules[rule.ruleType]) {
      groupedRules[rule.ruleType] = [];
    }
    groupedRules[rule.ruleType]!.push(rule);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pricing Configuration</h2>
          <p className="text-gray-600 mt-1">
            Configure pricing rules for automatic booking price calculation
          </p>
        </div>
        <button
          onClick={handleCreateRule}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Pricing Rule
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How Pricing Works</p>
            <p>
              Pricing rules are applied automatically when creating or editing bookings. The system calculates:
              <strong> Base Price</strong> + <strong>Square Footage</strong> + <strong>Bedrooms</strong> +
              <strong> Bathrooms</strong> + <strong>Extra Services</strong>. Time estimates are also calculated based on your rules.
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {pricingRulesQuery.isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading pricing rules...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {pricingRulesQuery.isError && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading pricing rules</p>
          </div>
        </div>
      )}

      {/* Pricing Rules by Type */}
      {pricingRulesQuery.data && (
        <div className="space-y-6">
          {Object.entries(RULE_TYPE_LABELS).map(([ruleType, label]) => {
            const rules = groupedRules[ruleType] || [];
            const Icon = RULE_TYPE_ICONS[ruleType];

            return (
              <div key={ruleType} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {label} ({rules.length})
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  {rules.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No {label.toLowerCase()} rules configured
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`p-4 rounded-lg border-2 ${
                            rule.isActive
                              ? "bg-white border-gray-200"
                              : "bg-gray-50 border-gray-300 opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                                {!rule.isActive && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              {rule.serviceType && (
                                <p className="text-sm text-gray-600 mb-2">
                                  Service: <span className="font-medium">{rule.serviceType}</span>
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-sm">
                                {rule.priceAmount !== null && (
                                  <span className="text-green-700">
                                    💰 ${rule.priceAmount.toFixed(2)}
                                  </span>
                                )}
                                {rule.ratePerUnit !== null && (
                                  <span className="text-green-700">
                                    💰 ${rule.ratePerUnit.toFixed(2)}/unit
                                  </span>
                                )}
                                {rule.timeAmount !== null && (
                                  <span className="text-blue-700">
                                    ⏱️ {rule.timeAmount}h
                                  </span>
                                )}
                                {rule.timePerUnit !== null && (
                                  <span className="text-blue-700">
                                    ⏱️ {rule.timePerUnit}h/unit
                                  </span>
                                )}
                                {rule.extraName && (
                                  <span className="text-purple-700">
                                    📦 {rule.extraName}
                                  </span>
                                )}
                              </div>
                              {rule.extraDescription && (
                                <p className="text-xs text-gray-500 mt-2">{rule.extraDescription}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditRule(rule)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit rule"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id, rule.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete rule"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <PricingRuleForm
          rule={selectedRule}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedRule(undefined);
          }}
          isSubmitting={createRuleMutation.isPending || updateRuleMutation.isPending}
        />
      )}
    </div>
  );
}
