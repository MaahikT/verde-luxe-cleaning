import { createFileRoute } from "@tanstack/react-router";
import { ServicePageTemplate } from "~/components/ServicePageTemplate";
import { Truck, CheckCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/services/moving-cleaning/")({
  component: MovingCleaningPage,
});

function MovingCleaningPage() {
  return (
    <ServicePageTemplate
      title="Move-In/Out Cleaning"
      subtitle="One less thing to worry about during your move."
      heroImage="/imported/images/bg3.jpg"
      description={
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            One Less Thing to Worry About
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            Moving is stressful enough. Let us handle the deep cleaning of your
            old or new home so you can focus on settling in or saying goodbye.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            Our move-in/out cleaning ensures properties are spotless for new
            occupants or helps you get your security deposit back.
          </p>
        </div>
      }
      benefits={[
        {
          icon: <Truck className="w-16 h-16" />,
          title: "Moving Day Ready",
          description:
            "We coordinate with your moving schedule to clean before or after the move.",
        },
        {
          icon: <CheckCircle className="w-16 h-16" />,
          title: "Deposit-Back Guarantee",
          description:
            "Our thorough cleaning helps ensure you get your full security deposit returned.",
        },
        {
          icon: <Sparkles className="w-16 h-16" />,
          title: "Empty Home Specialist",
          description:
            "We clean every nook and cranny that's usually hidden by furniture and belongings.",
        },
      ]}
      galleryImages={[
        "/imported/images/services/photo15.jpg",
        "/imported/images/services/photo16.jpg",
        "/imported/images/services/photo17.jpg",
      ]}
      faqs={[
        {
          question: "When should I schedule the cleaning?",
          answer:
            "Ideally after all belongings are removed but before the final walk-through.",
        },
        {
          question: "Do you clean inside cabinets and appliances?",
          answer:
            "Yes, move-in/out cleaning includes inside cabinets, drawers, and appliances.",
        },
      ]}
    />
  );
}
