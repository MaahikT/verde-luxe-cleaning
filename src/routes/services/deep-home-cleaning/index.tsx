import { createFileRoute } from "@tanstack/react-router";
import { ServicePageTemplate } from "~/components/ServicePageTemplate";
import { Sparkles, Shield, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/services/deep-home-cleaning/")({
  component: DeepHomeCleaningPage,
});

function DeepHomeCleaningPage() {
  return (
    <ServicePageTemplate
      title="Deep Home Cleaning"
      subtitle="A comprehensive, top-to-bottom clean that reaches every corner of your home."
      heroImage="/imported/images/bg3.jpg"
      description={
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            A Truly Deep Clean
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            Our Deep Clean service goes beyond the surface, tackling areas that
            are often overlooked in regular cleaning. Perfect for spring
            cleaning, preparing for guests, or simply giving your home a fresh
            start.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            This service includes everything in our Basic Clean, plus detailed
            attention to baseboards, inside cabinets, behind appliances, and
            more.
          </p>
        </div>
      }
      benefits={[
        {
          icon: <Sparkles className="w-16 h-16" />,
          title: "Thorough & Detailed",
          description:
            "We clean areas that are typically missed, ensuring every corner of your home sparkles.",
        },
        {
          icon: <Shield className="w-16 h-16" />,
          title: "Safe Products",
          description:
            "All our cleaning products are eco-friendly and safe for your family and pets.",
        },
        {
          icon: <CheckCircle className="w-16 h-16" />,
          title: "Satisfaction Guaranteed",
          description:
            "We stand behind our work with a 100% satisfaction guarantee on every deep clean.",
        },
      ]}
      galleryImages={[
        "/imported/images/services/photo4.jpg",
        "/imported/images/services/photo5.jpg",
        "/imported/images/services/photo6.jpg",
        "/imported/images/services/photo7.jpg",
      ]}
      faqs={[
        {
          question: "How long does a deep clean take?",
          answer:
            "Typically 4-8 hours depending on the size of your home and its condition.",
        },
        {
          question: "How often should I get a deep clean?",
          answer:
            "We recommend a deep clean 2-4 times per year, with regular basic cleans in between.",
        },
        {
          question: "Do I need to prepare anything?",
          answer:
            "Just clear any clutter from surfaces and ensure we have access to all areas you want cleaned.",
        },
      ]}
    />
  );
}
