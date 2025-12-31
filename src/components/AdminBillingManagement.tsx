import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { useEffect } from "react";
import {
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Info,
  CalendarX,
} from "lucide-react";
import toast from "react-hot-toast";

const billingConfigSchema = z.object({
  paymentHoldDelayHours: z
    .number()
    .int()
    .positive("Must be a positive number")
    .nullable()
    .transform((val) => (val === 0 ? null : val)),
  cancellationWindowHours: z
    .number()
    .int()
    .min(0, "Must be 0 or greater"),
  cancellationFeeAmount: z
    .number()
    .min(0, "Must be 0 or greater"),
});

type BillingConfigFormData = z.infer<typeof billingConfigSchema>;

export function AdminBillingManagement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Fetch current configuration
  const configQuery = useQuery(
    trpc.getConfiguration.queryOptions({
      authToken: token || "",
    })
  );

  // Update configuration mutation
  const updateConfigMutation = useMutation(
    trpc.updateConfiguration.mutationOptions({
      onSuccess: (data) => {
        toast.success("Billing configuration updated successfully!");
        queryClient.invalidateQueries({ queryKey: trpc.getConfiguration.queryKey() });
        // Reset form with new values to mark as clean
        reset({
          paymentHoldDelayHours: data.configuration.paymentHoldDelayHours,
          cancellationWindowHours: data.configuration.cancellationWindowHours,
          cancellationFeeAmount: data.configuration.cancellationFeeAmount,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update billing configuration");
      },
    })
  );

  // Initialize form with current values
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<BillingConfigFormData>({
    resolver: zodResolver(billingConfigSchema),
    defaultValues: {
      paymentHoldDelayHours: null,
      cancellationWindowHours: 48,
      cancellationFeeAmount: 50,
    },
  });

  // Update form when data is loaded
  const currentConfig = configQuery.data?.configuration;
  useEffect(() => {
    if (currentConfig) {
      reset({
        paymentHoldDelayHours: currentConfig.paymentHoldDelayHours,
        cancellationWindowHours: currentConfig.cancellationWindowHours,
        cancellationFeeAmount: currentConfig.cancellationFeeAmount,
      });
    }
  }, [currentConfig, reset]);

  const paymentHoldDelayHours = watch("paymentHoldDelayHours");
  const cancellationWindowHours = watch("cancellationWindowHours");
  const cancellationFeeAmount = watch("cancellationFeeAmount");

  const handleFormSubmit = (data: BillingConfigFormData) => {
    updateConfigMutation.mutate({
      authToken: token || "",
      paymentHoldDelayHours: data.paymentHoldDelayHours,
      cancellationWindowHours: data.cancellationWindowHours,
      cancellationFeeAmount: data.cancellationFeeAmount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-heading">Billing Configuration</h2>
        <p className="text-gray-600 mt-1">
          Configure payment hold timing and cancellation policies
        </p>
      </div>

      {/* Loading State */}
      {configQuery.isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading configuration...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {configQuery.isError && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-600" />
            <p className="text-red-900 font-semibold">Error loading configuration</p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      {configQuery.data && (
        <>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

            {/* Payment Hold Timing Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Payment Hold Timing</h3>
                </div>
              </div>
              <div className="p-6 space-y-6">
                 {/* ... existing payment hold fields ... */}
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Hold Delay (hours)
                  </label>
                  <input
                    type="number"
                    {...register("paymentHoldDelayHours", {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                    })}
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 48"
                    min="1"
                  />
                  {errors.paymentHoldDelayHours && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.paymentHoldDelayHours.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Leave empty to place payment holds immediately (default behavior).
                    <br />
                    If set, payment holds will only be placed when the booking is within this many hours of the scheduled time.
                  </p>
                </div>

                {/* Info & Display - Keeping existing structure but abbreviated for clarity in this replace call if possible, but replace tool requires matching content.
                   I will reconstruct the existing payment hold UI parts here to be safe and ensure functionality is preserved.
                */}
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">About Payment Hold Timing</p>
                        <p>
                          By default, payment holds are placed immediately when a booking is created.
                          You can configure a delay so that holds are only placed when the booking is
                          within a specified number of hours before the scheduled time. This can help
                          reduce authorization expiration issues for bookings scheduled far in advance.
                        </p>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Cancellation Policy Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <CalendarX className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Cancellation Policy</h3>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Window */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                       Cancellation Window (Hours)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        {...register("cancellationWindowHours", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">hrs</span>
                      </div>
                    </div>
                     <p className="mt-1 text-xs text-gray-500">
                        Bookings cancelled less than {cancellationWindowHours} hours before the start time may incur a fee.
                     </p>
                  </div>

                  {/* Fee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                       Cancellation Fee Amount ($)
                    </label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                         {...register("cancellationFeeAmount", { valueAsNumber: true })}
                        className="w-full pl-7 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                      />
                    </div>
                     <p className="mt-1 text-xs text-gray-500">
                        The standard fee amount to charge ({cancellationFeeAmount ? `$${cancellationFeeAmount}` : '$0'}).
                     </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                   <div className="flex items-start gap-3">
                     <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                     <div className="text-sm text-red-900">
                       <p className="font-semibold mb-1">Cancellation Policy Logic</p>
                       <ul className="list-disc list-inside space-y-1">
                          <li>If a customer cancels within <strong>{cancellationWindowHours} hours</strong> of the booking, the cancellation modal will suggest charging the fee.</li>
                          <li>The default fee will be set to <strong>${cancellationFeeAmount}</strong>, but can be overridden during cancellation.</li>
                          <li>A specific email notification will be sent based on whether a fee was charged or not.</li>
                       </ul>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => reset()}
                disabled={!isDirty || updateConfigMutation.isPending}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Changes
              </button>
              <button
                type="submit"
                disabled={!isDirty || updateConfigMutation.isPending}
                 className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updateConfigMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
