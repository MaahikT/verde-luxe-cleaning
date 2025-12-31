import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";

export const Route = createFileRoute("/terms-of-service/")({
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <Layout>
      <section className="py-24 md:py-32 bg-[#f6f3f2]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Terms of Service
              </h1>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 shadow-sm space-y-8">
              <p className="text-gray-600 leading-relaxed">
                Welcome to Verde Luxe Cleaning. By booking or using our services,
                you agree to the terms below. These terms are in place to ensure
                clarity, fairness, and professionalism in every interaction.
              </p>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  1. Booking & Payment
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  All services must be booked through our official platform. Full
                  payment is required upon confirmation unless pre-approved.
                  Additional fees may apply for extra services or unusual
                  conditions (e.g., excessive clutter, pet-related messes).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  2. Cancellations & Rescheduling
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We require at least 24 hours' notice for cancellations or
                  rescheduling. Late cancellations (within 24 hours) may result in
                  a fee of up to 50% of the scheduled service. Repeated
                  short-notice cancellations may affect future booking
                  eligibility.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  3. Entry to Property
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  You must ensure we have secure, safe, and legal access to your
                  property at the scheduled time. Failure to do so may result in a
                  missed appointment fee. If key codes or special entry
                  instructions are required, they must be shared in advance.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  4. Service Limitations
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We do not provide outdoor cleaning, biohazard removal, or heavy
                  lifting. Services are limited to agreed tasks per booking. Any
                  changes should be communicated in advance. We reserve the right
                  to refuse service in unsafe or unsanitary conditions.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  5. Satisfaction Guarantee
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  If you're not completely satisfied with the cleaning, please
                  contact us within 24 hours. We will revisit the location and
                  address the issue free of charge. After 24 hours, corrections
                  may incur additional fees at our discretion.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  6. Liability & Damages
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Our staff is insured and trained to treat your property with
                  care. However, we are not liable for damage caused by normal
                  wear, unstable fixtures, or items not disclosed as fragile.
                  Please secure valuables and inform us of any special handling
                  needs.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">7. Pets</h3>
                <p className="text-gray-600 leading-relaxed">
                  We love pets! However, for safety, please inform us in advance
                  if pets will be on the premises. Aggressive animals must be
                  secured during service.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  8. Privacy
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Your personal information is handled with care. We never sell
                  your data. For full details, see our{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-[#5e870d] hover:text-[#3d550c] underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  9. Right to Refuse Service
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We reserve the right to refuse or discontinue services for any
                  reason, including but not limited to unsafe conditions,
                  harassment, or failure to comply with our terms.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  10. Policy Updates
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We may revise these Terms of Service at any time. Changes will
                  be posted on this page with an updated effective date. Your
                  continued use of our services constitutes acceptance of these
                  updates.
                </p>
              </div>

              <p className="text-gray-600 leading-relaxed">
                <strong>Last Updated:</strong> June 2025
              </p>
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
