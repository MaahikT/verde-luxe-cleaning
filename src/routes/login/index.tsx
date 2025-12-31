import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginForm } from "~/components/LoginForm";
import { UserPlus, LogIn, ArrowLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

function LoginPage() {
  const [showLoginForm, setShowLoginForm] = useState(false);

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-bg to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to manage your Verde Luxe cleanings.
              </p>
            </div>

            <LoginForm showSignUpLink={false} />

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowLoginForm(false)}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to options
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-gray-bg flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div 
        className="absolute bottom-0 left-0 w-[600px] h-[600px] opacity-[0.25] bg-no-repeat -translate-x-1/4 translate-y-[40%]"
        style={{
          backgroundImage: 'url(/circle-of-megaphones.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'bottom left',
        }}
      />
      
      {/* Background decoration - top right */}
      <div 
        className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.25] bg-no-repeat translate-x-1/4 -translate-y-1/4"
        style={{
          backgroundImage: 'url(/circle-of-megaphones.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'top right',
        }}
      />
      
      {/* Content */}
      <div className="w-full max-w-xl relative z-10">
        {/* Header Section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3">
            Welcome
          </h1>
          <p className="text-sm sm:text-base text-gray-700">
            Tell us who you are.
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* New Customer Card */}
          <Link
            to="/register"
            className="group bg-white rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 p-4 flex flex-col items-center text-center min-h-[400px] border-2 border-transparent hover:border-primary"
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex-grow flex items-center">
              I'm a new customer
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-4 max-w-xs text-xs">
              Start your journey with Verde Luxe and experience premium cleaning services.
            </p>

            {/* Button */}
            <button className="w-full max-w-[160px] bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-5 rounded-full transition-colors duration-200 text-xs">
              Go
            </button>
          </Link>

          {/* Returning Customer Card */}
          <button
            onClick={() => setShowLoginForm(true)}
            className="group bg-gradient-to-br from-primary to-primary-dark rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 p-4 flex flex-col items-center text-center min-h-[400px] border-2 border-transparent hover:border-primary-light"
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <LogIn className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 flex-grow flex items-center">
              I've been here before
            </h2>

            {/* Description */}
            <p className="text-white/90 mb-4 max-w-xs text-xs">
              Welcome back! Sign in to manage your bookings and account.
            </p>

            {/* Button */}
            <div className="w-full max-w-[160px] bg-white text-primary hover:bg-gray-100 font-semibold py-2 px-5 rounded-full transition-colors duration-200 text-xs">
              Go
            </div>
          </button>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-gray-700">
          Need help?{" "}
          <a
            href="tel:7348920931"
            className="font-medium text-primary hover:text-primary-dark underline transition-colors"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
