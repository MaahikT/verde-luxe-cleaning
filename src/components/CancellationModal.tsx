import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition, Switch } from "@headlessui/react";
import { AlertTriangle, X, Loader, DollarSign, Send } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

interface Booking {
  id: number;
  scheduledDate: string | Date;
  finalPrice: number | null;
  client: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  serviceFrequency?: string | null;
}

interface Configuration {
  cancellationWindowHours: number;
  cancellationFeeAmount: number;
}

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onSuccess?: () => void;
}

export function CancellationModal({ isOpen, onClose, booking, onSuccess }: CancellationModalProps) {
  const { token } = useAuthStore();
  const trpc = useTRPC();

  const [reason, setReason] = useState("");
  const [chargeFee, setChargeFee] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [feeAmount, setFeeAmount] = useState(50.0);
  const [cancelFutureBookings, setCancelFutureBookings] = useState(false);

  // Fetch configuration to determine defaults
  const configQuery = useQuery(
    trpc.getConfiguration.queryOptions({ authToken: token || "" }, { enabled: isOpen })
  );

  const queryClient = useQueryClient();

  const cancelMutation = useMutation(trpc.cancelBookingAdmin.mutationOptions({
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      queryClient.invalidateQueries({ queryKey: trpc.getAllBookingsAdmin.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.getMonthlyDashboardMetrics.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.getBookingAvailability.queryKey() });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel booking");
    }
  }));

  // Logic to determine if fee should be charged by default
  useEffect(() => {
    if (isOpen && configQuery.data?.configuration && booking.scheduledDate) {
      const config = configQuery.data.configuration;
      const scheduledDate = new Date(booking.scheduledDate);
      const now = new Date();

      const hoursDifference = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If within cancellation window (e.g. less than 48 hours away), default to charge fee
      const shouldCharge = hoursDifference < (config.cancellationWindowHours ?? 48);

      setChargeFee(shouldCharge);
      setFeeAmount(config.cancellationFeeAmount ?? 50.0);
      setCancelFutureBookings(false); // Reset default
    }
  }, [isOpen, configQuery.data, booking.scheduledDate]);

  const handleConfirm = () => {
    cancelMutation.mutate({
      authToken: token || "",
      bookingId: booking.id,
      chargeFee,
      sendEmail,
      cancellationReason: reason,
      feeAmount: chargeFee ? feeAmount : undefined,
      cancelFutureBookings,
    });
  };

  const isLoading = configQuery.isLoading || cancelMutation.isPending;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  Cancel Booking #{booking.id}
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to cancel this booking for {booking.client.firstName}? This action cannot be undone.
                  </p>

                  {/* Reason Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cancellation Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      rows={3}
                      placeholder="e.g. Customer requested via phone..."
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">

                    {/* Recurring Cancellation Options */}
                    {booking.serviceFrequency && booking.serviceFrequency !== "ONE_TIME" && (
                      <div className="pb-4 border-b border-gray-200">
                         <label className="block text-sm font-medium text-gray-900 mb-2">Recurring Booking</label>
                         <div className="space-y-2">
                           <label className="flex items-center space-x-3 cursor-pointer">
                             <input
                               type="radio"
                               name="cancellationScope"
                               checked={!cancelFutureBookings}
                               onChange={() => setCancelFutureBookings(false)}
                               className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                             />
                             <span className="text-sm text-gray-700">Cancel this booking only</span>
                           </label>
                           <label className="flex items-center space-x-3 cursor-pointer">
                             <input
                               type="radio"
                               name="cancellationScope"
                               checked={cancelFutureBookings}
                               onChange={() => setCancelFutureBookings(true)}
                               className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                             />
                             <span className="text-sm text-gray-700">Cancel this and all future bookings</span>
                           </label>
                         </div>
                      </div>
                    )}

                    {/* Charge Fee Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          Charge Cancellation Fee
                        </span>
                        <span className="text-xs text-gray-500">
                          {configQuery.data?.configuration ? (
                             `Policy: ${configQuery.data.configuration.cancellationWindowHours ?? 48}h window`
                          ) : "Loading policy..."}
                        </span>
                      </div>
                      <Switch
                        checked={chargeFee}
                        onChange={setChargeFee}
                        className={`${
                          chargeFee ? 'bg-red-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
                      >
                        <span className={`${chargeFee ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                      </Switch>
                    </div>

                    {/* Fee Amount Input (if checked) */}
                    {chargeFee && (
                      <div className="ml-6 pl-4 border-l-2 border-gray-200">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fee Amount ($)</label>
                        <input
                          type="number"
                          value={feeAmount}
                          onChange={(e) => setFeeAmount(parseFloat(e.target.value))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-3"></div>

                    {/* Send Email Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Send className="w-4 h-4 text-gray-500" />
                          Send Notification Email
                        </span>
                        <span className="text-xs text-gray-500">
                          To: {booking.client.email}
                        </span>
                      </div>
                      <Switch
                        checked={sendEmail}
                        onChange={setSendEmail}
                        className={`${
                          sendEmail ? 'bg-primary' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                      >
                        <span className={`${sendEmail ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                      </Switch>
                    </div>
                  </div>

                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-transparent bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 border-gray-300"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Keep Booking
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
                    onClick={handleConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                    Confirm Cancellation
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


