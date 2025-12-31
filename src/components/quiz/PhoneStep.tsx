import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { sanitizePhoneNumber } from "~/utils/formatPhoneNumber";

const phoneStepSchema = z.object({
  phone: z.string().min(1, { message: "Phone number is required" }),
});

type PhoneStepFormData = z.infer<typeof phoneStepSchema>;

interface PhoneStepProps {
  defaultValues?: Partial<PhoneStepFormData>;
  onNext: (data: PhoneStepFormData) => void;
  onBack: () => void;
}

export function PhoneStep({
  defaultValues,
  onNext,
  onBack,
}: PhoneStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneStepFormData>({
    resolver: zodResolver(phoneStepSchema),
    defaultValues,
  });

  const onSubmit = (data: PhoneStepFormData) => {
    // Sanitize phone number before passing to parent
    const sanitizedData = {
      ...data,
      phone: sanitizePhoneNumber(data.phone) || data.phone, // Fallback to original if sanitization returns null
    };
    onNext(sanitizedData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-3">
          Your Contact Details
        </h1>
        <p className="text-base text-primary/70">
          What is your phone number?
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-primary mb-2"
          >
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            {...register("phone")}
            className="w-full border-0 border-b-2 border-gray-300 px-0 py-2.5 text-base text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-0 transition-colors bg-transparent"
          />
          {errors.phone && (
            <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-200 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-primary py-3 text-base font-semibold text-white hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? "Please wait..." : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
