import { Users, ChevronLeft, ChevronRight } from "lucide-react";

interface Provider {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  color: string | null;
}

interface ProviderListFloatingProps {
  providers: Provider[];
  isExpanded: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export function ProviderListFloating({ providers, isExpanded, onToggle, isLoading = false }: ProviderListFloatingProps) {
  const hasProviders = providers.length > 0;

  return (
    <div 
      className={`fixed top-20 right-0 bg-white rounded-l-xl shadow-2xl border-l-2 border-t-2 border-b-2 border-primary/20 overflow-hidden z-40 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Toggle Button - Always Visible */}
      <button
        onClick={onToggle}
        className="absolute top-4 left-3 w-10 h-10 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center z-20 ring-2 ring-white"
        title={isExpanded ? "Collapse provider list" : "Expand provider list"}
      >
        {isExpanded ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* Collapsed State Visual Indicator */}
      {!isExpanded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
          <Users className="w-5 h-5 text-primary" />
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          ) : hasProviders ? (
            <div className="flex flex-col items-center gap-0.5">
              {providers.slice(0, 3).map((provider) => (
                <div
                  key={provider.id}
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: provider.color || '#9CA3AF' }}
                />
              ))}
              {providers.length > 3 && (
                <span className="text-[10px] text-gray-500 font-semibold mt-1">
                  +{providers.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 font-semibold text-center px-1">
              No providers
            </span>
          )}
        </div>
      )}

      {/* Content - Only visible when expanded */}
      <div className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 pl-16">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">Providers</h3>
          </div>
        </div>

        {/* Provider List */}
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent"></div>
                <p className="text-sm text-gray-600">Loading providers...</p>
              </div>
            </div>
          ) : !hasProviders ? (
            <div className="p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No Providers Yet</p>
                  <p className="text-xs text-gray-600">
                    Create cleaner accounts to see them here
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {providers.map((provider) => {
                const displayName = provider.firstName && provider.lastName
                  ? `${provider.firstName} ${provider.lastName}`
                  : provider.email;
                const providerColor = provider.color || '#9CA3AF';

                return (
                  <div
                    key={provider.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Color Dot */}
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: providerColor }}
                      title={provider.color ? `Color: ${provider.color}` : 'No color assigned'}
                    />
                    
                    {/* Provider Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                      </p>
                      {!provider.color && (
                        <p className="text-xs text-gray-500">No color assigned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            Colors match calendar bookings
          </p>
        </div>
      </div>
    </div>
  );
}
