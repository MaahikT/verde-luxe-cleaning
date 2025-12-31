import { CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import { CreditCard, Calendar, Lock } from "lucide-react";

interface InlineStripeFormProps {
  disabled?: boolean;
}

export function InlineStripeForm({ disabled = false }: InlineStripeFormProps) {
  const elementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#1f2937",
        fontFamily: "system-ui, -apple-system, sans-serif",
        "::placeholder": {
          color: "#9ca3af",
        },
      },
      invalid: {
        color: "#dc2626",
      },
    },
  };

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <div className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow bg-white">
            <CardNumberElement options={elementOptions} />
          </div>
        </div>
      </div>

      {/* Expiration and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expiration <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow bg-white">
              <CardExpiryElement options={elementOptions} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CVC <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow bg-white">
              <CardCvcElement options={elementOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Your card information is securely processed by Stripe. We never store your full card details.
        </p>
      </div>
    </div>
  );
}
