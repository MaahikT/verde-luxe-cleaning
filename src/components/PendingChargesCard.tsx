import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { DollarSign, User, Calendar, Loader, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export function PendingChargesCard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Fetch pending charges (limit to first 5 for dashboard)
  const pendingChargesQuery = useQuery(
    trpc.getPendingChargesAdmin.queryOptions({
      authToken: token || "",
    })
  );

  // Mutation to capture payment
  const capturePaymentMutation = useMutation(
    trpc.capturePaymentHold.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Payment of $${data.amount.toFixed(2)} captured successfully!`);
        queryClient.invalidateQueries({ queryKey: trpc.getPendingChargesAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getBookingStatsAdmin.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to capture payment");
      },
    })
  );

  const handleChargeCard = (booking: any) => {
    if (!booking.payments || booking.payments.length === 0) {
      toast.error("No payment found for this booking");
      return;
    }

    const payment = booking.payments[0];
    const clientName = `${booking.client.firstName || ""} ${booking.client.lastName || ""}`.trim();

    if (window.confirm(
      `Charge $${booking.finalPrice?.toFixed(2) || "0.00"} to ${clientName}'s card?`
    )) {
      capturePaymentMutation.mutate({
        authToken: token || "",
        paymentId: payment.id,
      });
    }
  };

  const bookings = pendingChargesQuery.data?.bookings.slice(0, 5) || [];
  const totalCount = pendingChargesQuery.data?.bookings.length || 0;
  const isLoading = pendingChargesQuery.isLoading;

  return (
    <div className="bg-brand-white rounded-[20px] p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-medium text-brand-black mb-0.5">Pending Charges</h3>
          <p className="text-xs text-brand-grey">
            {totalCount > 0 ? `${totalCount} job${totalCount !== 1 ? 's' : ''} ready to charge` : 'All caught up!'}
          </p>
        </div>
        <div className="w-8 h-8 bg-brand-beige/50 rounded-lg flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-brand-black" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader className="w-6 h-6 animate-spin text-brand-grey" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 bg-brand-green-soft rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-5 h-5 text-brand-accent-green" />
          </div>
          <p className="text-brand-grey text-xs">No pending charges</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="group flex flex-col p-2.5 rounded-xl border border-transparent hover:border-brand-border hover:bg-brand-bg-light/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-brand-purple flex items-center justify-center text-brand-black text-[10px] font-bold">
                         {booking.client.firstName?.[0]}
                      </div>
                      <p className="text-sm font-medium text-brand-black truncate">
                        {booking.client.firstName} {booking.client.lastName}
                      </p>
                    </div>
                    <p className="text-[10px] text-brand-grey truncate pl-8">{booking.serviceType}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-brand-accent-green">
                      ${booking.finalPrice?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pl-8">
                  <div className="flex items-center gap-1.5 text-[10px] text-brand-grey">
                    <Calendar className="w-3 h-3" />
                    {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>

                  <button
                    onClick={() => handleChargeCard(booking)}
                    disabled={capturePaymentMutation.isPending}
                    className="px-3 py-1.5 bg-brand-black text-white rounded-lg hover:bg-gray-800 transition-colors text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {capturePaymentMutation.isPending ? (
                      <>
                        <Loader className="w-3 h-3 animate-spin" />
                        Charging...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3 h-3" />
                        Charge
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalCount > 5 && (
            <div className="mt-auto pt-3 text-center">
              <p className="text-[10px] text-brand-grey">
                +{totalCount - 5} more pending charge{totalCount - 5 !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
