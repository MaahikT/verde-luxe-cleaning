import { Building2, DollarSign } from "lucide-react";

interface Account {
  id: number;
  mercuryId: string;
  name: string;
  accountNumber: string | null;
  currentBalance: number;
  availableBalance: number;
  status: string;
  type: string | null;
  lastSyncedAt: Date | null;
}

interface BankAccountSummaryProps {
  accounts: Account[];
}

export function BankAccountSummary({ accounts }: BankAccountSummaryProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 font-heading">Connected Bank Accounts</h3>
        <p className="text-sm text-gray-600 mt-1">Overview of all your Mercury accounts</p>
      </div>
      <div className="p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="border-2 border-gray-200 rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50/30"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg font-heading truncate">{account.name}</h4>
                    {account.accountNumber && (
                      <p className="text-sm text-gray-500 font-mono mt-0.5">
                        ••••{account.accountNumber}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                    account.status === "active"
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {account.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Posted Balance</span>
                  <span className="text-xl font-bold text-gray-900 font-heading">
                    ${account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Available Balance</span>
                  <span className="text-lg font-bold text-primary">
                    ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              {account.lastSyncedAt && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Last synced: {new Date(account.lastSyncedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
