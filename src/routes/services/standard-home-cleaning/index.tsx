import { createFileRoute } from "@tanstack/react-router";
import { ServicePageTemplate } from "~/components/ServicePageTemplate";
import { LifeBuoy, Heart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/services/standard-home-cleaning/")({
  component: StandardHomeCleaningPage,
});

function StandardHomeCleaningPage() {
  return (
    <ServicePageTemplate
      title="Basic Clean with Verde Luxe"
      subtitle="Simple. Polished. Reliable. Experience the difference with our tailored basic clean service."
      heroImage="/imported/images/bg3.jpg"
      description={
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Effortless Clean, Every Time
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            Our Basic Clean is designed for busy homeowners and renters who need
            regular upkeep without deep scrubbing. It's ideal for apartments,
            condos, and smaller homes that need freshening up weekly or biweekly.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            This service includes dusting, sweeping, vacuuming, mopping, bathroom
            and kitchen touch-ups, and wiping down commonly used surfaces.
          </p>
        </div>
      }
      benefits={[
        {
          icon: <LifeBuoy className="w-16 h-16" />,
          title: "Tailored for Daily Life",
          description:
            "Our Basic Clean is made for real, lived-in homes—helping you stay ahead of clutter and grime between deeper cleans.",
        },
        {
          icon: <Heart className="w-16 h-16" />,
          title: "Health-Focused Cleaning",
          description:
            "We use hypoallergenic, pet- and child-safe cleaning solutions to promote your family's well-being.",
        },
        {
          icon: <Sparkles className="w-16 h-16" />,
          title: "Trusted Professionals",
          description:
            "Every cleaner is background checked and trained to maintain Verde Luxe Cleaning's high standard of care.",
        },
      ]}
      galleryImages={[
        "/imported/images/services/photo1.jpg",
        "/imported/images/services/photo2.jpg",
        "/imported/images/services/photo3.jpg",
        "/imported/images/services/photo9.jpg",
      ]}
      faqs={[
        {
          question: "What's included in the Basic Clean?",
          answer:
            "Includes surface wipe-downs, floors, trash removal, bathroom and kitchen sanitation.",
        },
        {
          question: "How often should I schedule this service?",
          answer:
            "We recommend biweekly for most households, but weekly and monthly plans are available.",
        },
        {
          question: "Do I need to be home?",
          answer:
            "Not necessary. Our team can work while you're away—just provide access instructions.",
        },
      ]}
    />
  );
}
