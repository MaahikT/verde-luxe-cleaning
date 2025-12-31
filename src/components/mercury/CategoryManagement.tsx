import { useState } from "react";
import { X, Plus, Edit2, Trash2, Tag, Loader } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

interface CategoryManagementProps {
  onClose: () => void;
}

export function CategoryManagement({ onClose }: CategoryManagementProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  // Fetch categories
  const categoriesQuery = useQuery(
    trpc.mercury.getCategories.queryOptions({
      authToken: token || "",
    })
  );

  // Create category mutation
  const createCategoryMutation = useMutation(
    trpc.mercury.createCategory.mutationOptions({
      onSuccess: () => {
        toast.success("Category created successfully");
        setIsCreating(false);
        setFormData({ name: "", description: "", color: "#3B82F6" });
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getCategories.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create category");
      },
    })
  );

  // Update category mutation
  const updateCategoryMutation = useMutation(
    trpc.mercury.updateCategory.mutationOptions({
      onSuccess: () => {
        toast.success("Category updated successfully");
        setEditingCategoryId(null);
        setFormData({ name: "", description: "", color: "#3B82F6" });
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getCategories.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update category");
      },
    })
  );

  // Delete category mutation
  const deleteCategoryMutation = useMutation(
    trpc.mercury.deleteCategory.mutationOptions({
      onSuccess: () => {
        toast.success("Category deleted successfully");
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getCategories.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete category");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategoryId) {
      updateCategoryMutation.mutate({
        authToken: token || "",
        categoryId: editingCategoryId,
        ...formData,
      });
    } else {
      createCategoryMutation.mutate({
        authToken: token || "",
        ...formData,
      });
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategoryId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#3B82F6",
    });
    setIsCreating(true);
  };

  const handleDelete = (categoryId: number, categoryName: string) => {
    if (confirm(`Are you sure you want to delete the category "${categoryName}"? This will uncategorize all associated transactions.`)) {
      deleteCategoryMutation.mutate({
        authToken: token || "",
        categoryId,
      });
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingCategoryId(null);
    setFormData({ name: "", description: "", color: "#3B82F6" });
  };

  const categories = categoriesQuery.data?.categories || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-primary to-primary-dark text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1 font-heading">Manage Categories</h2>
              <p className="text-green-100 text-sm">Organize your transactions by category</p>
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
                {editingCategoryId ? "Edit Category" : "Create New Category"}
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g., Supplies, Payroll, Marketing"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 font-mono">{formData.color}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingCategoryId ? (
                    "Update Category"
                  ) : (
                    "Create Category"
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
              Create New Category
            </button>
          )}

          {/* Categories List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Existing Categories</h3>
            
            {categoriesQuery.isLoading ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No categories yet. Create your first one above!
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category: any) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category.color ? `${category.color}20` : '#f3f4f6' }}
                      >
                        <Tag className="w-5 h-5" style={{ color: category.color || '#374151' }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {category._count?.transactions || 0} transactions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={deleteCategoryMutation.isPending}
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
