import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { useNavigate, Link } from "@tanstack/react-router";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginFormProps = {
  onSuccess?: () => void;
  showForgotPassword?: boolean;
  showSignUpLink?: boolean;
};

export function LoginForm({
  onSuccess,
  showForgotPassword = true,
  showSignUpLink = true,
}: LoginFormProps) {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation(
    trpc.login.mutationOptions({
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast.success("Login successful!");
        reset();
        
        // Call optional callback
        if (onSuccess) {
          onSuccess();
        }
        
        // Redirect based on user role
        if (data.user.role === "CLEANER") {
          navigate({ to: "/cleaner-portal" });
        } else if (data.user.role === "CLIENT") {
          navigate({ to: "/client-portal" });
        } else if (data.user.role === "ADMIN" || data.user.role === "OWNER") {
          navigate({ to: "/admin-portal" });
        } else {
          navigate({ to: "/" });
        }
      },
      onError: (error) => {
        toast.error(error.message || "Login failed");
      },
    })
  );

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
        {showForgotPassword && (
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              Forgot password?
            </Link>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </div>

      {showSignUpLink && (
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-primary hover:text-primary-dark"
          >
            Sign up
          </Link>
        </div>
      )}
    </form>
  );
}
