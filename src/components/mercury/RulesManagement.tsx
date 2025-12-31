import { useState } from "react";
import { X, Plus, Edit2, Trash2, Zap, Loader, ArrowRight } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

interface Category {
  id: number;
  name: string;
  color: string | null;
}

interface RulesManagementProps {
  categories: Category[];
  onClose: () => void;
}

export function RulesManagement({ categories, onClose }: RulesManagementProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    conditionType: "VENDOR_CONTAINS" as any,
    conditionValue: "",
    categoryId: 0,
    priority: 0,
    isActive: true,
  });

  // Fetch rules
  const rulesQuery = useQuery(
    trpc.mercury.getRules.queryOptions({
      authToken: token || "",
    })
  );

  // Create rule mutation
  const createRuleMutation = useMutation(
    trpc.mercury.createRule.mutationOptions({
      onSuccess: () => {
        toast.success("Rule created successfully");
        setIsCreating(false);
        setFormData({
          name: "",
          conditionType: "VENDOR_CONTAINS",
          conditionValue: "",
          categoryId: 0,
          priority: 0,
          isActive: true,
        });
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getRules.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create rule");
      },
    })
  );

  // Update rule mutation
  const updateRuleMutation = useMutation(
    trpc.mercury.updateRule.mutationOptions({
      onSuccess: () => {
        toast.success("Rule updated successfully");
        setEditingRuleId(null);
        setFormData({
          name: "",
          conditionType: "VENDOR_CONTAINS",
          conditionValue: "",
          categoryId: 0,
          priority: 0,
          isActive: true,
        });
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getRules.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update rule");
      },
    })
  );

  // Delete rule mutation
  const deleteRuleMutation = useMutation(
    trpc.mercury.deleteRule.mutationOptions({
      onSuccess: () => {
        toast.success("Rule deleted successfully");
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getRules.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete rule");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      toast.error("Please select a category");
      return;
    }

    if (editingRuleId) {
      updateRuleMutation.mutate({
        authToken: token || "",
        ruleId: editingRuleId,
        ...formData,
      });
    } else {
      createRuleMutation.mutate({
        authToken: token || "",
        ...formData,
      });
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRuleId(rule.id);
    setFormData({
      name: rule.name,
      conditionType: rule.conditionType,
      conditionValue: rule.conditionValue,
      categoryId: rule.categoryId,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsCreating(true);
  };

  const handleDelete = (ruleId: number, ruleName: string) => {
    if (confirm(`Are you sure you want to delete the rule "${ruleName}"?`)) {
      deleteRuleMutation.mutate({
        authToken: token || "",
        ruleId,
      });
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingRuleId(null);
    setFormData({
      name: "",
      conditionType: "VENDOR_CONTAINS",
      conditionValue: "",
      categoryId: 0,
      priority: 0,
      isActive: true,
    });
  };

  const rules = rulesQuery.data?.rules || [];

  const conditionTypeLabels: Record<string, string> = {
    VENDOR_CONTAINS: "Vendor/Description contains",
    DESCRIPTION_CONTAINS: "Description contains",
    COUNTERPARTY_EQUALS: "Counterparty equals",
    AMOUNT_EQUALS: "Amount equals",
    AMOUNT_GREATER_THAN: "Amount greater than",
    AMOUNT_LESS_THAN: "Amount less than",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-dark via-primary-dark to-primary text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1 font-heading">Manage Categorization Rules</h2>
              <p className="text-green-100 text-sm">Automatically categorize transactions based on rules</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Create/Edit Form */}
          {isCreating ? (
            <form onSubmit={handleSubmit} className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 font-heading">
                {editingRuleId ? "Edit Rule" : "Create New Rule"}
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g., Categorize Home Depot as Supplies"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Condition Type *
                  </label>
                  <select
                    value={formData.conditionType}
                    onChange={(e) => setFormData({ ...formData, conditionType: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  >
                    <option value="VENDOR_CONTAINS">Vendor/Description contains</option>
                    <option value="DESCRIPTION_CONTAINS">Description contains</option>
                    <option value="COUNTERPARTY_EQUALS">Counterparty equals</option>
                    <option value="AMOUNT_EQUALS">Amount equals</option>
                    <option value="AMOUNT_GREATER_THAN">Amount greater than</option>
                    <option value="AMOUNT_LESS_THAN">Amount less than</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Condition Value *
                  </label>
                  <input
                    type={formData.conditionType.includes("AMOUNT") ? "number" : "text"}
                    step={formData.conditionType.includes("AMOUNT") ? "0.01" : undefined}
                    value={formData.conditionValue}
                    onChange={(e) => setFormData({ ...formData, conditionValue: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder={
                      formData.conditionType.includes("AMOUNT")
                        ? "e.g., 100.00"
                        : "e.g., Home Depot"
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  >
                    <option value={0}>Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher priority rules are applied first</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createRuleMutation.isPending || updateRuleMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingRuleId ? (
                    "Update Rule"
                  ) : (
                    "Create Rule"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Rule
            </button>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Existing Rules</h3>
            
            {rulesQuery.isLoading ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No rules yet. Create your first one above!
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule: any) => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      rule.isActive
                        ? "bg-white border-primary/30 hover:border-primary/50 hover:shadow-sm"
                        : "bg-gray-50 border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        rule.isActive ? "bg-primary/10" : "bg-gray-200"
                      }`}>
                        <Zap className={`w-5 h-5 ${rule.isActive ? "text-primary" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">{rule.name}</p>
                          {!rule.isActive && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-600 rounded-full">
                              Inactive
                            </span>
                          )}
                          <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">
                            Priority: {rule.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-semibold">{conditionTypeLabels[rule.conditionType]}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                            "{rule.conditionValue}"
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: rule.category.color ? `${rule.category.color}20` : '#f3f4f6',
                              color: rule.category.color || '#374151',
                            }}
                          >
                            {rule.category.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id, rule.name)}
                        disabled={deleteRuleMutation.isPending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
