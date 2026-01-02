import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { PaymentForm } from "~/components/PaymentForm";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { z } from "zod";
import { useAuthStore } from "~/stores/authStore";
import { Loader2, AlertCircle, Lock } from "lucide-react";

const paymentSearchSchema = z.object({
  amount: z.number().optional().default(100),
  bookingId: z.number().optional().default(1),
});

export const Route = createFileRoute("/payment/")({
  component: PaymentPage,
  validateSearch: paymentSearchSchema,
});

function PaymentPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { amount, bookingId } = Route.useSearch();
  const { token } = useAuthStore();

  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [hasInitiatedPayment, setHasInitiatedPayment] = useState(false);

  // Get publishable key
  const publishableKeyQuery = useQuery(
    trpc.payment.getPublishableKey.queryOptions()
  );

  // Create payment intent
  const createPaymentIntentMutation = useMutation(
    trpc.payment.createPaymentIntent.mutationOptions({
      onSuccess: (data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      },
    })
  );

  // Initialize Stripe when we have the publishable key
  useEffect(() => {
    if (publishableKeyQuery.data?.publishableKey) {
      setStripePromise(loadStripe(publishableKeyQuery.data.publishableKey));
    }
  }, [publishableKeyQuery.data]);

  // Create payment intent on mount
  useEffect(() => {
    if (token && !hasInitiatedPayment) {
      setHasInitiatedPayment(true);
      createPaymentIntentMutation.mutate({
        authToken: token,
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        bookingId,
        captureMethod: "automatic",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, amount, bookingId, hasInitiatedPayment]);

  const handlePaymentSuccess = () => {
    setTimeout(() => {
      navigate({ to: "/client-portal" });
    }, 2000);
  };

  // Now handle conditional rendering after all hooks
  if (!token) {
    return (
      <Layout>
        <section className="pt-[140px] pb-[60px] bg-[#f8f9fa] min-h-screen">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg p-8 shadow-lg text-center">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Authentication Required
                </h2>
                <p className="text-gray-600 mb-6">
                  Please log in to complete your payment.
                </p>
                <button
                  onClick={() => navigate({ to: "/login" })}
                  className="px-6 py-3 text-base font-semibold text-white bg-primary border-2 border-primary rounded-full hover:bg-primary-dark hover:border-primary-dark transition-all duration-300"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (
    publishableKeyQuery.isLoading ||
    createPaymentIntentMutation.isPending ||
    !clientSecret ||
    !stripePromise
  ) {
    return (
      <Layout>
        <section className="pt-[140px] pb-[60px] bg-[#f8f9fa] min-h-screen">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg p-8 shadow-lg text-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Preparing Payment
                </h2>
                <p className="text-gray-600">
                  Please wait while we set up your secure payment...
                </p>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (publishableKeyQuery.error || createPaymentIntentMutation.error) {
    return (
      <Layout>
        <section className="pt-[140px] pb-[60px] bg-[#f8f9fa] min-h-screen">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg p-8 shadow-lg text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Payment Setup Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {publishableKeyQuery.error?.message ||
                    createPaymentIntentMutation.error?.message ||
                    "An error occurred while setting up payment"}
                </p>
                <button
                  onClick={() => navigate({ to: "/client-portal" })}
                  className="px-6 py-3 text-base font-semibold text-white bg-primary border-2 border-primary rounded-full hover:bg-primary-dark hover:border-primary-dark transition-all duration-300"
                >
                  Back to Portal
                </button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#163022",
        colorBackground: "#ffffff",
        colorText: "#212529",
        colorDanger: "#dc3545",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Layout>
      <section className="pt-[140px] pb-[60px] bg-[#f8f9fa] min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Secure Payment
              </h1>
              <p className="text-gray-600">
                Complete your booking payment for booking #{bookingId}
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-lg">
              <Elements stripe={stripePromise} options={options}>
                <PaymentForm
                  amount={amount}
                  bookingId={bookingId}
                  authToken={token || ""}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate({ to: "/client-portal" })}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← Back to Portal
              </button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
