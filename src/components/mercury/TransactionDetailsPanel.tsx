import { X, Calendar, DollarSign, Building2, Tag, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";

interface Category {
  id: number;
  name: string;
  color: string | null;
}

interface TransactionDetailsPanelProps {
  transactionId: number;
  categories: Category[];
  onClose: () => void;
}

export function TransactionDetailsPanel({ transactionId, categories, onClose }: TransactionDetailsPanelProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();

  // Fetch transactions to find the selected one
  const transactionsQuery = useQuery(
    trpc.mercury.getTransactions.queryOptions({
      authToken: token || "",
      limit: 1000,
      offset: 0,
    })
  );

  const transaction = transactionsQuery.data?.transactions.find((t: any) => t.id === transactionId);

  if (!transaction) {
    return null;
  }

  const isDebit = transaction.amount < 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:justify-end z-[1000] p-0 sm:p-4">
      <div className="bg-white w-full sm:w-[500px] h-full sm:h-[calc(100vh-2rem)] sm:rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-primary to-primary-dark text-white p-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1 font-heading">Transaction Details</h2>
            <p className="text-green-100 text-sm">{new Date(transaction.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Amount Card */}
          <div className={`rounded-xl p-6 ${isDebit ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Amount</span>
              {isDebit ? (
                <TrendingDown className="w-5 h-5 text-red-500" />
              ) : (
                <TrendingUp className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className={`text-4xl font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
              {isDebit ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="w-4 h-4" />
              Description
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-900 font-medium">
                {transaction.editedDescription || transaction.description}
              </p>
              {transaction.editedDescription && transaction.description !== transaction.editedDescription && (
                <p className="text-xs text-gray-500 mt-2">
                  Original: {transaction.description}
                </p>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Tag className="w-4 h-4" />
              Category
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {transaction.category ? (
                <span
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: transaction.category.color ? `${transaction.category.color}20` : '#f3f4f6',
                    color: transaction.category.color || '#374151',
                  }}
                >
                  {transaction.category.name}
                </span>
              ) : (
                <span className="text-gray-500 text-sm">Uncategorized</span>
              )}
            </div>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Building2 className="w-4 h-4" />
              Account
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-900 font-medium">{transaction.account.name}</p>
              {transaction.account.accountNumber && (
                <p className="text-xs text-gray-500 mt-1">****{transaction.account.accountNumber}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Calendar className="w-4 h-4" />
              Status
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  transaction.status === "POSTED"
                    ? "bg-green-100 text-green-800"
                    : transaction.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {transaction.status}
              </span>
            </div>
          </div>

          {/* Counterparty */}
          {transaction.counterpartyName && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <DollarSign className="w-4 h-4" />
                Counterparty
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-900">{transaction.counterpartyName}</p>
                {transaction.counterpartyId && (
                  <p className="text-xs text-gray-500 mt-1">ID: {transaction.counterpartyId}</p>
                )}
              </div>
            </div>
          )}

          {/* Bank Description */}
          {transaction.bankDescription && transaction.bankDescription !== transaction.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4" />
                Bank Description
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 text-sm">{transaction.bankDescription}</p>
              </div>
            </div>
          )}

          {/* Transaction ID */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="w-4 h-4" />
              Transaction ID
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600 font-mono break-all">{transaction.mercuryId}</p>
            </div>
          </div>

          {/* Additional Details */}
          {transaction.details && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4" />
                Additional Details
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {JSON.stringify(transaction.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
