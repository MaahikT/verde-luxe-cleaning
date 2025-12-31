import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { QuizLayout } from "~/components/QuizLayout";
import { IntroStep } from "~/components/quiz/IntroStep";
import { StartStep } from "~/components/quiz/StartStep";
import { EmailStep } from "~/components/quiz/EmailStep";
import { PhoneStep } from "~/components/quiz/PhoneStep";

export const Route = createFileRoute("/book-now/")({
  component: BookNowPage,
});

type BookingFormData = {
  name?: string;
  email?: string;
  phone?: string;
};

function BookNowPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showIntro, setShowIntro] = useState(true);
  const [formData, setFormData] = useState<BookingFormData>({});

  const handleStartQuiz = () => {
    setShowIntro(false);
  };

  const handleStartStepNext = (data: { name: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleEmailStepNext = (data: { email: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleEmailStepBack = () => {
    setCurrentStep(1);
  };

  const handlePhoneStepNext = (data: { phone: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  const handlePhoneStepBack = () => {
    setCurrentStep(2);
  };

  // Calculate visual step for progress bar
  // Step 1: Start
  // Step 2: Your Details (Email)
  // Step 3: Your Details (Phone) -> visually Step 2
  // Step 4: Your Clean -> visually Step 3
  const getVisualStep = (step: number) => {
    if (step <= 1) return 1;
    if (step === 2 || step === 3) return 2;
    return step - 1;
  };

  return (
    <QuizLayout currentStep={getVisualStep(currentStep)}>
      <div className="py-8">
        {currentStep === 1 && (
          <>
            {showIntro ? (
              <IntroStep onStart={handleStartQuiz} />
            ) : (
              <StartStep
                defaultValues={{ name: formData.name }}
                onNext={handleStartStepNext}
              />
            )}
          </>
        )}
        {currentStep === 2 && (
          <EmailStep
            defaultValues={{ email: formData.email }}
            onNext={handleEmailStepNext}
            onBack={handleEmailStepBack}
          />
        )}
        {currentStep === 3 && (
          <PhoneStep
            defaultValues={{ phone: formData.phone }}
            onNext={handlePhoneStepNext}
            onBack={handlePhoneStepBack}
          />
        )}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Step 4: Your Clean
            </h2>
            <p className="text-primary/70">
              This step will be implemented next. Form data collected so far:
            </p>
            <pre className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </QuizLayout>
  );
}
