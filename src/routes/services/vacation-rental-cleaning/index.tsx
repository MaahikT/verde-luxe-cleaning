import { createFileRoute } from "@tanstack/react-router";
import { ServicePageTemplate } from "~/components/ServicePageTemplate";
import { Clock, Star, Users } from "lucide-react";

export const Route = createFileRoute("/services/vacation-rental-cleaning/")({
  component: VacationRentalCleaningPage,
});

function VacationRentalCleaningPage() {
  return (
    <ServicePageTemplate
      title="Vacation Rental Cleaning"
      subtitle="Hospitality-level cleaning that keeps your guests happy and your reviews glowing."
      heroImage="/imported/images/bg3.jpg"
      description={
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Hospitality-Level Cleaning
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            Keep your vacation rental in pristine condition with our specialized
            turnover service. We understand the importance of quick turnarounds
            and consistent quality for your guests.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            From Airbnb to VRBO properties, we ensure every guest arrives to a
            spotless, welcoming space.
          </p>
        </div>
      }
      benefits={[
        {
          icon: <Clock className="w-16 h-16" />,
          title: "Fast Turnaround",
          description:
            "We work efficiently to meet tight check-in/check-out schedules without compromising quality.",
        },
        {
          icon: <Star className="w-16 h-16" />,
          title: "5-Star Standards",
          description:
            "Our cleaning meets hospitality industry standards to help you maintain excellent reviews.",
        },
        {
          icon: <Users className="w-16 h-16" />,
          title: "Guest-Ready Every Time",
          description:
            "Consistent, thorough cleaning ensures every guest has the same great experience.",
        },
      ]}
      galleryImages={[
        "/imported/images/services/photo8.jpg",
        "/imported/images/services/photo10.jpg",
        "/imported/images/services/photo11.jpg",
      ]}
      faqs={[
        {
          question: "How quickly can you turn around a rental?",
          answer:
            "We can typically complete a turnover in 2-4 hours, depending on the property size.",
        },
        {
          question: "Do you provide linens and restocking?",
          answer:
            "We focus on cleaning. Linen service and restocking can be arranged separately.",
        },
      ]}
    />
  );
}
