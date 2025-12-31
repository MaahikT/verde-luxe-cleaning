import { Check } from "lucide-react";
import React from "react";

interface QuizProgressBarProps {
  currentStep: number;
}

const steps = [
  { id: 1, label: "Start" },
  { id: 2, label: "Your Details" },
  { id: 3, label: "Your Clean" },
  { id: 4, label: "Your Address" },
  { id: 5, label: "Finish" },
];

export function QuizProgressBar({ currentStep }: QuizProgressBarProps) {
  return (
    <div className="w-full relative py-2">
      {/* Container for the progress line and checkpoints */}
      <div className="relative h-10">
        {/* Thin horizontal progress line */}
        <div className="absolute left-0 right-0 top-2 h-[1px] bg-gray-200">
          {/* Progress fill showing completed portion */}
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Checkpoint circles */}
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isFuture = currentStep < step.id;

          // Calculate position for even spacing
          const positionStyle: React.CSSProperties = {
            left: `${(index / (steps.length - 1)) * 100}%`,
          };

          return (
            <div
              key={step.id}
              className="absolute -translate-x-1/2"
              style={positionStyle}
            >
              <div className="flex flex-col items-center">
                {/* Checkpoint circle */}
                <div
                  className={`
                    w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted ? "bg-primary text-white" : ""}
                    ${isActive ? "bg-primary text-white shadow-lg shadow-primary/50 ring-4 ring-primary/20" : ""}
                    ${isFuture ? "bg-white border-2 border-gray-200" : ""}
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {/* Show check icon for completed steps */}
                  {isCompleted && <Check className="w-2.5 h-2.5 text-white" />}
                </div>

                {/* Step label */}
                <div
                  className={`
                    mt-1 text-[10px] sm:text-xs text-center whitespace-nowrap transition-colors duration-300 font-serif
                    ${isActive ? "text-primary font-semibold" : ""}
                    ${isCompleted ? "text-primary" : ""}
                    ${isFuture ? "text-gray-500" : ""}
                  `}
                >
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
