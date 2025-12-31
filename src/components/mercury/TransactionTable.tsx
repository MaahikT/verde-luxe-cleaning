import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { Search, Filter, ChevronDown, Edit2, Check, X, TrendingDown, TrendingUp, Loader } from "lucide-react";
import toast from "react-hot-toast";

interface Account {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  color: string | null;
  _count?: {
    transactions: number;
  };
}

interface TransactionTableProps {
  accounts: Account[];
  categories: Category[];
  onTransactionClick: (transactionId: number) => void;
}

export function TransactionTable({ accounts, categories, onTransactionClick }: TransactionTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "PENDING" | "POSTED" | "excluded">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<"PENDING" | "POSTED" | "CANCELLED" | undefined>();
  const [transactionType, setTransactionType] = useState<"debit" | "credit" | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Editing state
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  // Fetch transactions - determine status based on active tab
  const effectiveStatus = activeTab === "all" ? undefined : activeTab === "excluded" ? undefined : activeTab;
  const effectiveCategoryFilter = activeTab === "excluded" ? null : selectedCategory;

  const transactionsQuery = useQuery(
    trpc.mercury.getTransactions.queryOptions({
      authToken: token || "",
      accountId: selectedAccount,
      categoryId: effectiveCategoryFilter,
      status: effectiveStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      transactionType,
      searchQuery: searchQuery || undefined,
      limit: 100,
      offset: 0,
    })
  );

  // Update transaction mutation
  const updateTransactionMutation = useMutation(
    trpc.mercury.updateTransaction.mutationOptions({
      onSuccess: () => {
        toast.success("Transaction updated successfully");
        setEditingTransactionId(null);
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getTransactions.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update transaction");
      },
    })
  );

  const handleStartEdit = (transaction: any) => {
    setEditingTransactionId(transaction.id);
    setEditingDescription(transaction.editedDescription || transaction.description);
    setEditingCategoryId(transaction.categoryId);
  };

  const handleSaveEdit = () => {
    if (editingTransactionId === null) return;

    updateTransactionMutation.mutate({
      authToken: token || "",
      transactionId: editingTransactionId,
      editedDescription: editingDescription || null,
      categoryId: editingCategoryId,
    });
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
    setEditingDescription("");
    setEditingCategoryId(null);
  };

  const transactions = transactionsQuery.data?.transactions || [];
  const filteredTransactions = activeTab === "excluded"
    ? transactions.filter((t: any) => !t.categoryId)
    : transactions;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Status Tabs */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
                activeTab === "all"
                  ? "text-primary border-b-2 border-primary -mb-[1px]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Transactions
              {activeTab === "all" && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {transactionsQuery.data?.totalCount || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("POSTED")}
              className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
                activeTab === "POSTED"
                  ? "text-primary border-b-2 border-primary -mb-[1px]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Posted
              {activeTab === "POSTED" && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {transactionsQuery.data?.totalCount || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
                activeTab === "PENDING"
                  ? "text-primary border-b-2 border-primary -mb-[1px]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pending
              {activeTab === "PENDING" && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {transactionsQuery.data?.totalCount || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("excluded")}
              className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
                activeTab === "excluded"
                  ? "text-primary border-b-2 border-primary -mb-[1px]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Excluded
              {activeTab === "excluded" && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {filteredTransactions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                showFilters
                  ? "bg-primary text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters && <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {/* Account Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account</label>
                  <select
                    value={selectedAccount || ""}
                    onChange={(e) => setSelectedAccount(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    disabled={activeTab === "excluded"}
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="all">All Types</option>
                    <option value="debit">Debits Only</option>
                    <option value="credit">Credits Only</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedAccount(undefined);
                    setSelectedCategory(undefined);
                    setTransactionType("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        {transactionsQuery.isLoading ? (
          <div className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="text-gray-600 font-medium">Loading transactions...</p>
            </div>
          </div>
        ) : transactionsQuery.isError ? (
          <div className="p-12 text-center">
            <p className="text-red-600 font-semibold">Error loading transactions</p>
            <p className="text-sm text-red-500 mt-1">{transactionsQuery.error.message}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 font-medium">No transactions found</p>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === "excluded"
                ? "All transactions are categorized"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredTransactions.map((transaction: any) => {
                const isEditing = editingTransactionId === transaction.id;
                const isDebit = transaction.amount < 0;

                return (
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => !isEditing && onTransactionClick(transaction.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs" onClick={(e) => isEditing && e.stopPropagation()}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-primary/50 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{transaction.editedDescription || transaction.description}</p>
                          {transaction.counterpartyName && (
                            <p className="text-xs text-gray-500 mt-0.5">{transaction.counterpartyName}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 font-medium">{transaction.account.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => isEditing && e.stopPropagation()}>
                      {isEditing ? (
                        <select
                          value={editingCategoryId || ""}
                          onChange={(e) => setEditingCategoryId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-primary/50 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : transaction.category ? (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: transaction.category.color ? `${transaction.category.color}20` : '#f3f4f6',
                            color: transaction.category.color || '#374151',
                          }}
                        >
                          {transaction.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isDebit ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        )}
                        <span className={`font-bold text-base ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                          {isDebit ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          transaction.status === "POSTED"
                            ? "bg-green-100 text-green-700"
                            : transaction.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updateTransactionMutation.isPending}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {updateTransactionMutation.isPending ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={updateTransactionMutation.isPending}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(transaction);
                          }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
