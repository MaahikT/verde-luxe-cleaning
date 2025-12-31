import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { QuizProgressBar } from "~/components/QuizProgressBar";

interface QuizLayoutProps {
  currentStep: number;
  children: ReactNode;
}

export function QuizLayout({ currentStep, children }: QuizLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-gray-bg relative overflow-hidden flex flex-col">
      {/* Background decoration - bottom left */}
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

      {/* Header - Made smaller to match logo size */}
      <header className="relative z-10 bg-white shadow-sm">
        {/* Logo - Positioned at absolute far left */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 z-20 translate-y-[-6px]">
          <Link to="/" className="flex-shrink-0">
            <img
              src="/eco-clean-logo.png"
              alt="Verde Luxe Cleaning"
              className="h-14 w-auto"
            />
          </Link>
        </div>

        {/* Progress Bar - Centered */}
        <div className="max-w-5xl mx-auto px-4 py-1">
          <QuizProgressBar currentStep={currentStep} />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
