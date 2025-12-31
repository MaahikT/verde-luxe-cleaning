import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";

export const Route = createFileRoute("/privacy-policy/")({
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <Layout>
      <section className="py-24 md:py-32 bg-[#f6f3f2]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Privacy Policy
              </h1>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 shadow-sm space-y-8">
              <p className="text-gray-600 leading-relaxed">
                At <strong>Verde Luxe Cleaning</strong> ("Verde Luxe", "we",
                "us"), your privacy, trust, and clarity matter deeply. This
                Privacy Policy explains what personal data we collect, how we use
                it, when we share it, how we protect it, and what rights you
                have. It applies across our website, booking forms, communications
                (email, phone), and any associated services under Verde Luxe.
              </p>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  1. Personal Information We Collect
                </h3>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Identifiers & Contact Details:</strong> your name,
                  email, phone, service address, and login credentials if you use
                  an account.
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Service & Transaction Details:</strong> requested
                  service types, scheduling preferences, special instructions,
                  service notes, invoices, and tokenized payment references (not
                  full card numbers).
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Communications:</strong> messages via forms, email, or
                  phone, including support and follow-up notes.
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Technical & Usage Data:</strong> IP address, browser
                  type, device model, visits to website pages, interactions, and
                  analytics from cookies or similar tools.
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Referral & Marketing Context:</strong> how you reached
                  our site (ads, links, campaigns).
                </p>
                <p className="text-gray-600 leading-relaxed">
                  <strong>Optional Photos:</strong> any "before/after" images you
                  share to help with estimates, quality assurance, or damage
                  documentation.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  2. How & When We Collect Your Data
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When you request a quote, submit a booking inquiry, complete
                  forms, or sign in. When you communicate with us via phone,
                  email, chat, or social platforms. Automatically while you browse
                  our website through cookies and analytics. From integrated
                  service partners like payment processors or scheduling tools when
                  needed to deliver services.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  3. Why We Use Your Information
                </h3>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Service Delivery:</strong> scheduling cleanings, matching
                  cleaners, processing payments, and providing support.
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Communication:</strong> sending confirmations, reminders,
                  and responding to inquiries via email or phone.
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Improvement & Security:</strong> analyzing site
                  performance, troubleshooting issues, preventing fraud, and
                  refining service offerings.
                </p>
                <p className="text-gray-600 leading-relaxed mb-2">
                  <strong>Promotions (optional):</strong> sending marketing
                  messages where you've given permission (you can opt out anytime).
                </p>
                <p className="text-gray-600 leading-relaxed">
                  <strong>Legal & Compliance:</strong> retaining records to meet
                  legal obligations, resolve disputes, or enforce our policies.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  4. Legal Basis for Processing
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We process data based on your consent, contract needs (booking
                  services), legitimate interests (e.g., improvements, fraud
                  detection), or to comply with legal obligations.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  5. Who We Share Data With
                </h3>
                <p className="text-gray-600 leading-relaxed mb-2">
                  We do not sell your personal information. We may share it with:
                </p>
                <p className="text-gray-600 leading-relaxed">
                  • Payment & scheduling partners to handle service delivery.<br />
                  • Email platforms for sending notifications.<br />
                  • Independent cleaning professionals for job details required to
                  perform your service.<br />
                  • Service providers (analytics, IT, security) under
                  confidentiality agreements.<br />
                  • Legal or law enforcement entities when required.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  18. Contact Us
                </h3>
                <p className="text-gray-600 leading-relaxed mb-2">
                  Have questions or want to exercise your privacy rights? Contact
                  us at:
                </p>
                <p className="text-gray-600 leading-relaxed">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:contact@verdeluxecleaning.com"
                    className="text-[#5e870d] hover:text-[#3d550c]"
                  >
                    contact@verdeluxecleaning.com
                  </a>
                  <br />
                  <strong>Location:</strong> Southeast Michigan
                </p>
                <p className="text-gray-600 leading-relaxed mt-4">
                  <strong>Last Updated:</strong> August 22, 2025
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  19. Consent
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  By using our website or services, you acknowledge and agree to
                  our Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/imported/images/bg2.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Get professional & affordable
            <br />
            house cleaning today
          </h2>
          <Link
            to="/book-now"
            className="inline-block px-8 py-4 text-base font-semibold text-white bg-[#5e870d] rounded-full hover:bg-[#3d550c] transition-colors uppercase"
          >
            Book Now
          </Link>
        </div>
      </section>
    </Layout>
  );
}
