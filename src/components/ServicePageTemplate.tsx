import { ReactNode } from "react";
import { Layout } from "./Layout";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ServicePageTemplateProps {
  title: string;
  subtitle: string;
  heroImage: string;
  description: ReactNode;
  benefits: Array<{
    icon: ReactNode;
    title: string;
    description: string;
  }>;
  galleryImages: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export function ServicePageTemplate({
  title,
  subtitle,
  heroImage,
  description,
  benefits,
  galleryImages,
  faqs,
}: ServicePageTemplateProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-[150px] pb-[100px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-opensans text-[48px] leading-[1.2] text-white mb-5 font-normal">
              <span className="font-bold">{title}</span>
            </h2>
            <p className="text-lg text-white mb-[30px]">{subtitle}</p>
            <Link
              to="/book-now"
              className="inline-block px-[25px] py-[15px] text-[15px] font-semibold text-white bg-primary rounded-full hover:bg-primary-dark transition-all uppercase"
            >
              Book Now
            </Link>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-[60px]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            <div className="order-2 lg:order-2">
              <div className="bg-white rounded-md border border-gray-200 p-2 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)]">
                <img
                  src={galleryImages[0]}
                  alt={title}
                  className="w-full rounded-[5px]"
                />
              </div>
            </div>
            <div className="order-1 lg:order-1 px-0 lg:px-8 pb-0">
              {description}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-[60px] bg-gray-bg">
          <div className="container mx-auto px-4">
            <div className="text-center mb-[60px] px-0 md:px-[60px] max-w-4xl mx-auto">
              <h2 className="text-[32px] font-bold text-black mb-5">
                What Sets Our {title} Apart?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 justify-center max-w-5xl mx-auto">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-white rounded-md p-5 border-0 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] h-full"
                >
                  <div className="text-primary text-[56px] leading-[1.2] mb-3">
                    {benefit.icon}
                  </div>
                  <h2 className="text-[18px] font-bold text-black mb-3">
                    {benefit.title}
                  </h2>
                  <p className="text-sm text-[#565656] leading-relaxed mb-0">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section className="py-[60px] bg-gray-bg">
          <div className="container mx-auto px-4">
            <div className="text-center mb-[60px] px-0 md:px-[60px] max-w-4xl mx-auto">
              <h2 className="text-[32px] font-bold text-black mb-0">FAQs</h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-md border border-gray-200 overflow-hidden mb-3"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className={`w-full px-5 py-3 text-left font-semibold text-sm flex items-center justify-between transition-colors rounded-md border-t border-gray-200 ${
                      openFaq === index
                        ? "bg-primary-dark text-white rounded-b-none"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    <span>{faq.question}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-5 py-3 bg-white pb-[5px]">
                      <p className="text-gray-text leading-relaxed text-sm mb-0">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/imported/images/bg2.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 container mx-auto px-4 text-center mb-[30px]">
          <h2 className="text-[32px] font-bold text-white mb-[30px]">
            Get professional & affordable
            <br />
            house cleaning today
          </h2>
          <Link
            to="/book-now"
            className="inline-block px-[25px] py-[15px] text-[15px] font-semibold text-white bg-primary rounded-full hover:bg-primary-dark transition-all uppercase mb-2"
          >
            Book Now
          </Link>
        </div>
      </section>
    </Layout>
  );
}
