import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { PortalLayout } from "~/components/PortalLayout";
import { Building2, RefreshCw, Loader, XCircle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import toast from "react-hot-toast";
import { BankAccountSummary } from "~/components/mercury/BankAccountSummary";
import { TransactionTable } from "~/components/mercury/TransactionTable";
import { TransactionDetailsPanel } from "~/components/mercury/TransactionDetailsPanel";
import { CategoryManagement } from "~/components/mercury/CategoryManagement";
import { RulesManagement } from "~/components/mercury/RulesManagement";

export const Route = createFileRoute("/admin-portal/bank-transactions/")({
  component: BankTransactionsPage,
});

export function BankTransactionsContent() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showRulesManagement, setShowRulesManagement] = useState(false);

  // Redirect if not authenticated or not an admin/owner
  useEffect(() => {
    if (!token || !user) {
      toast.error("Please log in to access the admin portal");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      toast.error("Access denied. Admin privileges required.");
      navigate({ to: "/" });
    }
  }, [token, user, navigate]);

  // Fetch accounts
  const accountsQuery = useQuery(
    trpc.mercury.getAccounts.queryOptions({
      authToken: token || "",
    })
  );

  // Fetch categories
  const categoriesQuery = useQuery(
    trpc.mercury.getCategories.queryOptions({
      authToken: token || "",
    })
  );

  // Sync transactions mutation
  const syncMutation = useMutation(
    trpc.mercury.syncTransactions.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: trpc.mercury.getTransactions.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to sync transactions");
      },
    })
  );

  const handleSync = () => {
    syncMutation.mutate({
      authToken: token || "",
    });
  };

  if (!token || !user) {
    return null;
  }

  const accounts = accountsQuery.data?.accounts || [];
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalAvailable = accounts.reduce((sum, acc) => sum + acc.availableBalance, 0);

  return (
    <>
      <div className="bg-[#EAE9E3] min-h-screen">
        {/* Header Section */}
        <div className="bg-[#EAE9E3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center border border-gray-300">
                  <Building2 className="w-8 h-8 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold font-heading text-gray-900">
                    Bank Transactions
                  </h1>
                  <p className="mt-1 text-gray-700 text-sm">
                    Mercury Business Banking Integration
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCategoryManagement(true)}
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-300 text-sm font-medium"
                >
                  Manage Categories
                </button>
                <button
                  onClick={() => setShowRulesManagement(true)}
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-300 text-sm font-medium"
                >
                  Manage Rules
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {syncMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Sync Transactions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Summary Cards */}
            {accountsQuery.isLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <p className="text-gray-600 font-medium">Loading accounts...</p>
                </div>
              </div>
            ) : accountsQuery.isError ? (
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <XCircle className="w-12 h-12 text-red-600" />
                  <p className="text-red-900 font-semibold">Error loading accounts</p>
                  <p className="text-red-700 text-sm">{accountsQuery.error.message}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Total Balance Summary */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Balance</p>
                    <p className="text-3xl font-bold text-gray-900 font-heading">
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Available Balance</p>
                    <p className="text-3xl font-bold text-gray-900 font-heading">
                      ${totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-700" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Active Accounts</p>
                    <p className="text-3xl font-bold text-gray-900 font-heading">
                      {accounts.filter(a => a.status === 'active').length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      of {accounts.length} total
                    </p>
                  </div>
                </div>

                {/* Account Details */}
                <BankAccountSummary accounts={accounts} />

                {/* Transactions Table */}
                <TransactionTable
                  accounts={accounts}
                  categories={categoriesQuery.data?.categories || []}
                  onTransactionClick={setSelectedTransactionId}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details Panel */}
      {selectedTransactionId && (
        <TransactionDetailsPanel
          transactionId={selectedTransactionId}
          categories={categoriesQuery.data?.categories || []}
          onClose={() => setSelectedTransactionId(null)}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryManagement && (
        <CategoryManagement
          onClose={() => setShowCategoryManagement(false)}
        />
      )}

      {/* Rules Management Modal */}
      {showRulesManagement && (
        <RulesManagement
          categories={categoriesQuery.data?.categories || []}
          onClose={() => setShowRulesManagement(false)}
        />
      )}
    </>
  );
}

function BankTransactionsPage() {
  return (
    <PortalLayout portalType="admin">
      <BankTransactionsContent />
    </PortalLayout>
  );
}
