import { useState } from "react";
import { CreditCard, Trash2, CheckCircle, AlertTriangle, Loader } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

interface AdminSavedCardsSectionProps {
  userId: number;
}

export function AdminSavedCardsSection({ userId }: AdminSavedCardsSectionProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch saved payment methods for the customer
  const savedCardsQuery = useQuery({
    ...trpc.payment.getSavedPaymentMethods.queryOptions({
      authToken: token || "",
      clientId: userId,
    }),
    enabled: !!token && !!userId,
  });

  // Delete payment method mutation
  const deleteMutation = useMutation({
    ...trpc.payment.deleteSavedPaymentMethod.mutationOptions(),
    onSuccess: () => {
      toast.success("Card removed successfully");
      setCardToDelete(null);
      setIsDeleting(false);
      // Invalidate the specific query for this user to refresh the list
      queryClient.invalidateQueries({
        queryKey: trpc.payment.getSavedPaymentMethods.queryKey({
          authToken: token || "",
          clientId: userId,
        }),
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove card");
      setIsDeleting(false);
    },
  });

  const handleDeleteCard = async (cardId: number) => {
    setIsDeleting(true);
    deleteMutation.mutate({
      authToken: token || "",
      paymentMethodId: cardId,
    });
  };

  const savedCards = savedCardsQuery.data?.paymentMethods || [];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        Saved Payment Methods
      </h3>

      {/* Loading State */}
      {savedCardsQuery.isLoading && (
        <div className="text-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 text-primary animate-spin" />
            <p className="text-gray-600 text-sm">Loading saved cards...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {savedCardsQuery.isError && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-red-900 font-medium">Error Loading Cards</p>
              <p className="text-red-700 text-sm mt-1">Please try refreshing the page</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!savedCardsQuery.isLoading && !savedCardsQuery.isError && savedCards.length === 0 && (
        <div className="text-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-900 font-medium">No Saved Cards</p>
              <p className="text-gray-600 text-sm mt-1">
                This customer hasn't saved any payment methods yet
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards List */}
      {!savedCardsQuery.isLoading && !savedCardsQuery.isError && savedCards.length > 0 && (
        <div className="space-y-3">
          {savedCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Card Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-gray-900 capitalize">
                        {card.brand}
                      </h4>
                      <span className="text-gray-600 text-sm">•••• {card.last4}</span>
                      {card.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                    </p>
                  </div>
                </div>

                {/* Delete Action */}
                <button
                  onClick={() => setCardToDelete(card.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Note */}
      {!savedCardsQuery.isLoading && !savedCardsQuery.isError && savedCards.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 flex-shrink-0 mt-0.5">ℹ️</div>
            <p className="text-xs text-blue-900">
              Deleting a card will remove it from Stripe and immediately disappear from the client's saved card list. This action cannot be undone.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {cardToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Remove Card</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to remove this card? It will be deleted from Stripe and immediately disappear from the client's saved card list. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCardToDelete(null);
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCard(cardToDelete)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Card"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
