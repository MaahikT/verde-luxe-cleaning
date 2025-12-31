interface IntroStepProps {
  onStart: () => void;
}

export function IntroStep({ onStart }: IntroStepProps) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-3">
          Welcome to Verde Luxe Cleaning
        </h1>
        <p className="text-base text-primary/70">
          Book your professional cleaning service in just a few easy steps
        </p>
      </div>

      <button
        onClick={onStart}
        className="w-full max-w-md mx-auto rounded-lg bg-primary py-4 px-8 text-xl font-semibold text-white hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
      >
        Get 20% Off
      </button>

      <p className="mt-4 text-sm text-primary/60">
        Special offer for new customers
      </p>
    </div>
  );
}
