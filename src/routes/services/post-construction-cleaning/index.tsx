import { createFileRoute } from "@tanstack/react-router";
import { ServicePageTemplate } from "~/components/ServicePageTemplate";
import { HardHat, Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/services/post-construction-cleaning/")({
  component: PostConstructionCleaningPage,
});

function PostConstructionCleaningPage() {
  return (
    <ServicePageTemplate
      title="Post Construction Cleaning"
      subtitle="Transform your construction site into a move-in ready space."
      heroImage="/imported/images/bg3.jpg"
      description={
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready for a Fresh Start
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            Construction and renovation projects leave behind dust, debris, and
            residue. Our post-construction cleaning removes all traces of work,
            revealing your beautiful new space.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            From new builds to remodels, we handle the heavy-duty cleaning so
            you can move in or open for business immediately.
          </p>
        </div>
      }
      benefits={[
        {
          icon: <HardHat className="w-16 h-16" />,
          title: "Construction Specialist",
          description:
            "We're experienced in handling the unique challenges of post-construction cleaning.",
        },
        {
          icon: <Trash2 className="w-16 h-16" />,
          title: "Debris Removal",
          description:
            "We remove construction dust, stickers, protective films, and other residue.",
        },
        {
          icon: <Sparkles className="w-16 h-16" />,
          title: "Move-In Ready",
          description:
            "Your space will be pristine and ready for occupancy or business operations.",
        },
      ]}
      galleryImages={[
        "/imported/images/services/photo18.jpg",
        "/imported/images/services/photo19.jpg",
        "/imported/images/services/photo20.jpg",
      ]}
      faqs={[
        {
          question: "When should I schedule post-construction cleaning?",
          answer:
            "After all construction work is complete and contractors have removed their equipment.",
        },
        {
          question: "Do you remove paint splatters and adhesive?",
          answer:
            "Yes, we carefully remove paint, adhesive, and protective films from surfaces.",
        },
      ]}
    />
  );
}
