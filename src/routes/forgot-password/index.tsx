import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "~/components/Layout";
import toast from "react-hot-toast";

export const Route = createFileRoute("/forgot-password/")({
  component: ForgotPasswordPage,
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
  temporaryPassword: z.string().min(1, "Temporary password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotPasswordMutation = useMutation(
    trpc.forgotPassword.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 2000);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reset password");
      },
    })
  );

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate({
      email: data.email,
      temporaryPassword: data.temporaryPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email, temporary password, and a new password to reset your account
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="temporaryPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Temporary Password
                </label>
                <input
                  id="temporaryPassword"
                  type="text"
                  autoComplete="off"
                  {...register("temporaryPassword")}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Temporary password from admin"
                />
                {errors.temporaryPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.temporaryPassword.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter the temporary password that was provided to you. If you don't have it, please contact us.
                </p>
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("newPassword")}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="New password (min. 8 characters)"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {forgotPasswordMutation.isPending ? "Resetting password..." : "Reset Password"}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary-dark text-sm"
              >
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
