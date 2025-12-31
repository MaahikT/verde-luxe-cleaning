import { useState, useEffect } from "react";
import { CreditCard, Trash2, CheckCircle, Plus, AlertTriangle, Loader, X } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardNumberElement } from "@stripe/react-stripe-js";
import { InlineStripeForm } from "~/components/InlineStripeForm";

// Modal component for adding a new card
function AddCardModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  const savePaymentMethodMutation = useMutation({
    ...trpc.payment.savePaymentMethod.mutationOptions(),
    onSuccess: () => {
      toast.success("Card added successfully!");
      queryClient.invalidateQueries({
        queryKey: trpc.payment.getSavedPaymentMethods.queryKey(),
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add card");
      setIsProcessing(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      toast.error("Payment system not ready");
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment method from card element
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error("Card element not found");
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardNumberElement,
        billing_details: {
          name: user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : undefined,
          email: user.email,
        },
      });

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message || "Failed to create payment method");
      }

      // Save the payment method
      await savePaymentMethodMutation.mutateAsync({
        authToken: token || "",
        clientId: user.id,
        paymentMethodId: paymentMethod.id,
        setAsDefault: setAsDefault,
      });
    } catch (error) {
      console.error("Error adding card:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add card");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Add New Card</h2>
              <p className="text-green-100 text-sm">
                Securely save a payment method
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <InlineStripeForm disabled={isProcessing} />

            {/* Set as default option */}
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  disabled={isProcessing}
                  className="w-4 h-4 mt-0.5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    Set as default payment method
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    This card will be used for future bookings by default
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Card
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Wrapper component that provides Stripe Elements context
function AddCardModalWithStripe({
  stripePromise,
  onClose,
  onSuccess,
}: {
  stripePromise: Promise<Stripe | null>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <Elements stripe={stripePromise}>
      <AddCardModal onClose={onClose} onSuccess={onSuccess} />
    </Elements>
  );
}

export function SavedCardsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  // Fetch Stripe publishable key
  const publishableKeyQuery = useQuery(
    trpc.payment.getPublishableKey.queryOptions()
  );

  // Initialize Stripe when we have the publishable key
  useEffect(() => {
    if (publishableKeyQuery.data?.publishableKey) {
      const promise = loadStripe(publishableKeyQuery.data.publishableKey);
      setStripePromise(promise);
    }
  }, [publishableKeyQuery.data]);

  // Fetch saved payment methods
  const savedCardsQuery = useQuery({
    ...trpc.payment.getSavedPaymentMethods.queryOptions({
      authToken: token || "",
      clientId: user?.id || 0,
    }),
    enabled: !!token && !!user?.id,
  });

  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    ...trpc.payment.setDefaultPaymentMethod.mutationOptions(),
    onSuccess: () => {
      toast.success("Default card updated successfully");
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: trpc.payment.getSavedPaymentMethods.queryKey(),
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update default card");
    },
  });

  // Delete payment method mutation
  const deleteMutation = useMutation({
    ...trpc.payment.deleteSavedPaymentMethod.mutationOptions(),
    onSuccess: () => {
      toast.success("Card removed successfully");
      setCardToDelete(null);
      setIsDeleting(false);
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: trpc.payment.getSavedPaymentMethods.queryKey(),
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove card");
      setIsDeleting(false);
    },
  });

  const handleSetDefault = (cardId: number) => {
    setDefaultMutation.mutate({
      authToken: token || "",
      paymentMethodId: cardId,
    });
  };

  const handleDeleteCard = async (cardId: number) => {
    setIsDeleting(true);
    deleteMutation.mutate({
      authToken: token || "",
      paymentMethodId: cardId,
    });
  };

  const savedCards = savedCardsQuery.data?.paymentMethods || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Cards</h1>
          <p className="text-gray-600">
            Manage your saved payment methods for faster checkout
          </p>
        </div>
        <button
          onClick={() => setShowAddCardModal(true)}
          disabled={!stripePromise}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Card
        </button>
      </div>

      {/* Loading State */}
      {savedCardsQuery.isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading your saved cards...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {savedCardsQuery.isError && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-red-900 font-semibold text-lg mb-1">Error Loading Cards</p>
              <p className="text-red-700 text-sm">Please try refreshing the page</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!savedCardsQuery.isLoading && !savedCardsQuery.isError && savedCards.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg mb-1">No Saved Cards</p>
              <p className="text-gray-600 text-sm mb-4">
                You haven't saved any payment methods yet
              </p>
              <button
                onClick={() => setShowAddCardModal(true)}
                disabled={!stripePromise}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Your First Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards List */}
      {!savedCardsQuery.isLoading && !savedCardsQuery.isError && savedCards.length > 0 && (
        <div className="space-y-4">
          {savedCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Card Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-lg capitalize">
                        {card.brand}
                      </h3>
                      <span className="text-gray-600">•••• {card.last4}</span>
                      {card.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!card.isDefault && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      disabled={setDefaultMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {setDefaultMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          Setting...
                        </span>
                      ) : (
                        "Set as Default"
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setCardToDelete(card.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove card"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      {!savedCardsQuery.isLoading && !savedCardsQuery.isError && savedCards.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
              ℹ️
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium mb-1">About Saved Cards</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your default card will be used for future bookings</li>
                <li>• All cards are securely stored with Stripe</li>
                <li>• You can add multiple cards and switch between them</li>
                <li>• Removing a card will not affect past bookings</li>
              </ul>
            </div>
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
                  Are you sure you want to remove this card? This action cannot be undone.
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

      {/* Add Card Modal */}
      {showAddCardModal && stripePromise && (
        <AddCardModalWithStripe
          stripePromise={stripePromise}
          onClose={() => setShowAddCardModal(false)}
          onSuccess={() => {
            // Refresh the cards list
            savedCardsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
