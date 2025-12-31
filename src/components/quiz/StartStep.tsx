import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const startStepSchema = z.object({
  name: z.string().min(1, { message: "Please enter your name" }),
});

type StartStepFormData = z.infer<typeof startStepSchema>;

interface StartStepProps {
  defaultValues?: Partial<StartStepFormData>;
  onNext: (data: StartStepFormData) => void;
}

export function StartStep({ defaultValues, onNext }: StartStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StartStepFormData>({
    resolver: zodResolver(startStepSchema),
    defaultValues,
  });

  const onSubmit = (data: StartStepFormData) => {
    onNext(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-3">
          Let's Get Started!
        </h1>
        <p className="text-base text-primary/70">
          First, we'd love to know your name
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-primary mb-2"
          >
            Your Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            {...register("name")}
            className="w-full border-0 border-b-2 border-gray-300 px-0 py-2.5 text-base text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-0 transition-colors bg-transparent"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {isSubmitting ? "Please wait..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
