import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";

const emailStepSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
});

type EmailStepFormData = z.infer<typeof emailStepSchema>;

interface EmailStepProps {
  defaultValues?: Partial<EmailStepFormData>;
  onNext: (data: EmailStepFormData) => void;
  onBack: () => void;
}

export function EmailStep({
  defaultValues,
  onNext,
  onBack,
}: EmailStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailStepFormData>({
    resolver: zodResolver(emailStepSchema),
    defaultValues,
  });

  const onSubmit = (data: EmailStepFormData) => {
    onNext(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-3">
          Your Contact Details
        </h1>
        <p className="text-base text-primary/70">
          What is your email address?
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-primary mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            {...register("email")}
            className="w-full border-0 border-b-2 border-gray-300 px-0 py-2.5 text-base text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-0 transition-colors bg-transparent"
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
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
