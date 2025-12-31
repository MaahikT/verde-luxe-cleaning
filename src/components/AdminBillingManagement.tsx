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
} from "lucide-react";
import toast from "react-hot-toast";

const billingConfigSchema = z.object({
  paymentHoldDelayHours: z
    .number()
    .int()
    .positive("Must be a positive number")
    .nullable()
    .transform((val) => (val === 0 ? null : val)),
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
    },
  });

  // Update form when data is loaded
  const currentConfig = configQuery.data?.configuration;
  useEffect(() => {
    if (currentConfig) {
      reset({
        paymentHoldDelayHours: currentConfig.paymentHoldDelayHours,
      });
    }
  }, [currentConfig, reset]);

  const paymentHoldDelayHours = watch("paymentHoldDelayHours");

  const handleFormSubmit = (data: BillingConfigFormData) => {
    updateConfigMutation.mutate({
      authToken: token || "",
      paymentHoldDelayHours: data.paymentHoldDelayHours,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-heading">Billing Configuration</h2>
        <p className="text-gray-600 mt-1">
          Configure payment hold timing and other billing settings
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
          {/* Info Box */}
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

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Payment Hold Timing</h3>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Payment Hold Delay Input */}
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

                {/* Current Behavior Display */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Current Behavior
                      </p>
                      {paymentHoldDelayHours ? (
                        <p className="text-sm text-gray-700">
                          Payment holds will be placed automatically when a booking reaches{" "}
                          <span className="font-semibold text-primary">
                            {paymentHoldDelayHours} hours
                          </span>{" "}
                          before its scheduled time. Bookings created within this window will have
                          holds placed immediately.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700">
                          Payment holds are placed <span className="font-semibold">immediately</span>{" "}
                          when bookings are created or updated with a saved payment method.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Example Scenarios */}
                {paymentHoldDelayHours && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900 mb-2">
                          Example Scenarios
                        </p>
                        <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                          <li>
                            Booking created 7 days in advance: Hold placed automatically {paymentHoldDelayHours} hours before
                          </li>
                          <li>
                            Booking created {Math.floor(paymentHoldDelayHours / 2)} hours in advance: Hold placed immediately
                          </li>
                          <li>
                            Booking updated with new payment method: Hold timing follows same rules
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Important Notes</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>
                          This setting applies to all new and updated bookings with saved payment methods
                        </li>
                        <li>
                          You'll need to implement a scheduled job to automatically place holds at the configured time
                        </li>
                        <li>
                          Existing bookings with holds already placed will not be affected
                        </li>
                      </ul>
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
                    Reset
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
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
