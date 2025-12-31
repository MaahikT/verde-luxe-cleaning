import { createFileRoute } from "@tanstack/react-router";
import { ServicePageTemplate } from "~/components/ServicePageTemplate";
import { Building, Shield, Clock } from "lucide-react";

export const Route = createFileRoute("/services/commercial-cleaning/")({
  component: CommercialCleaningPage,
});

function CommercialCleaningPage() {
  return (
    <ServicePageTemplate
      title="Commercial Cleaning"
      subtitle="Professional cleaning services that keep your business looking its best."
      heroImage="/imported/images/bg3.jpg"
      description={
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Professional Spaces, Maintained
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            Create a clean, professional environment for your employees and
            clients. Our commercial cleaning services are designed to maintain
            your business space to the highest standards.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            From offices to retail spaces, we provide reliable, consistent
            cleaning that keeps your business running smoothly.
          </p>
        </div>
      }
      benefits={[
        {
          icon: <Building className="w-16 h-16" />,
          title: "All Business Types",
          description:
            "We service offices, retail stores, medical facilities, and more with specialized cleaning protocols.",
        },
        {
          icon: <Shield className="w-16 h-16" />,
          title: "Insured & Bonded",
          description:
            "Full insurance coverage and bonding for your peace of mind and protection.",
        },
        {
          icon: <Clock className="w-16 h-16" />,
          title: "Flexible Scheduling",
          description:
            "We work around your business hours, including evenings and weekends.",
        },
      ]}
      galleryImages={[
        "/imported/images/services/photo12.jpg",
        "/imported/images/services/photo13.jpg",
        "/imported/images/services/photo14.jpg",
      ]}
      faqs={[
        {
          question: "Can you clean after business hours?",
          answer:
            "Yes, we offer flexible scheduling including evenings and weekends to minimize disruption.",
        },
        {
          question: "Do you provide supplies?",
          answer:
            "Yes, all cleaning supplies and equipment are provided by us.",
        },
      ]}
    />
  );
}
