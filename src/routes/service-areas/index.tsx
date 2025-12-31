import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { Globe } from "lucide-react";

export const Route = createFileRoute("/service-areas/")({
  component: ServiceAreasPage,
});

function ServiceAreasPage() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-[150px] pb-[100px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/imported/images/bg3.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-opensans text-[58px] leading-[1.2] text-white mb-5 font-normal">
              <span className="font-bold">Where We Service</span>
            </h2>
            <p className="text-lg text-white mb-0 max-w-3xl mx-auto">
              Verde Luxe is proud to offer premium eco-conscious cleaning to
              homes and businesses across Southeast Michigan. Whether you're in
              the city or the suburbs, our professionals bring top-tier service
              to your doorstep.
            </p>
          </div>
        </div>
      </section>

      {/* Service Areas Grid */}
      <section className="py-[60px] bg-gray-bg">
        <div className="container mx-auto px-4">
          <div className="text-center mb-[60px] px-[60px] max-w-none mx-auto">
            <h2 className="text-[36px] font-bold text-black mb-0">
              We Proudly Serve These Communities
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {serviceAreas.map((area) => (
              <div
                key={area}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] transition-shadow group text-center h-full"
              >
                <Globe className="w-[30px] h-[30px] text-black mb-[2px] mx-auto inline-block transition-all duration-300 group-hover:animate-[upDown_0.8s_ease-in-out_infinite_alternate]" />
                <h3 className="text-base font-bold text-black transition-colors duration-500 group-hover:text-primary">
                  {area}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/imported/images/bg2.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 container mx-auto px-4 text-center mb-[30px]">
          <h2 className="text-[34px] font-bold text-white mb-[30px]">
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

const serviceAreas = [
  "Canton",
  "Dearborn",
  "Dearborn Heights",
  "Farmington",
  "Farmington Hills",
  "Garden City",
  "Livonia",
  "Northville",
  "Northville Township",
  "Novi",
  "Plymouth Township",
  "Romulus",
  "Southfield",
  "Van Buren Township",
  "Wayne",
  "Westland",
  "Ypsilanti",
  "Ypsilanti Township",
];
