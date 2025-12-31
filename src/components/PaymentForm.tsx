import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface PaymentFormProps {
  amount: number; // Amount in dollars
  bookingId: number;
  authToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentForm({
  amount,
  bookingId,
  authToken,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const trpc = useTRPC();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const recordPaymentMutation = useMutation(
    trpc.payment.recordSuccessfulPayment.mutationOptions({
      onSuccess: () => {
        setPaymentStatus("succeeded");
        toast.success("Payment successful!");
        onSuccess?.();
      },
      onError: (error) => {
        setPaymentStatus("failed");
        const message = error.message || "Failed to record payment";
        setErrorMessage(message);
        toast.error(message);
        onError?.(message);
      },
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("processing");
    setErrorMessage("");

    try {
      // Confirm the payment with Stripe
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Record the payment in our database
        await recordPaymentMutation.mutateAsync({
          authToken,
          paymentIntentId: paymentIntent.id,
          bookingId,
        });
      } else if (paymentIntent && paymentIntent.status === "requires_capture") {
        // Payment authorized but not captured - still record it
        await recordPaymentMutation.mutateAsync({
          authToken,
          paymentIntentId: paymentIntent.id,
          bookingId,
        });
      } else {
        throw new Error(
          `Payment failed with status: ${paymentIntent?.status || "unknown"}`
        );
      }
    } catch (err) {
      setPaymentStatus("failed");
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(message);
      toast.error(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === "succeeded") {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Payment Successful!
        </h3>
        <p className="text-gray-600">
          Your payment of ${amount.toFixed(2)} has been processed successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Total Amount:</span>
          <span className="text-2xl font-bold text-gray-900">
            ${amount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-md p-3 bg-white">
          <PaymentElement />
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || paymentStatus === "succeeded"}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-[#6c9a4e] border-2 border-[#6c9a4e] rounded-full hover:bg-[#5a8442] hover:border-[#5a8442] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment information is secure and encrypted. We use Stripe for
        payment processing.
      </p>
    </form>
  );
}
