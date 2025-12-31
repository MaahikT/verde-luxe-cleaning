import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { useState } from "react";

export const Route = createFileRoute("/checklist/")({
  component: ChecklistPage,
});

function ChecklistPage() {
  const [activeTab, setActiveTab] = useState("kitchen");

  return (
    <Layout>
      <section className="pt-[130px] py-[60px] bg-gray-bg">
        <div className="container mx-auto px-4">
          <div className="text-center mb-[60px] px-[60px] max-w-none mx-auto">
            <h2 className="text-[36px] font-bold text-black mb-0">
              Cleaning Checklist
            </h2>
          </div>

          {/* Tabs */}
          <div className="text-center block mb-[30px]">
            <button
              onClick={() => setActiveTab("kitchen")}
              className={`inline-block px-5 py-[10px] text-[15px] font-bold rounded-[5px] mx-[5px] mb-[10px] transition-all duration-300 ${
                activeTab === "kitchen"
                  ? "bg-primary-dark text-white border-0"
                  : "bg-white text-black border border-primary-dark hover:bg-gray-100"
              }`}
            >
              Kitchen
            </button>
            <button
              onClick={() => setActiveTab("bathrooms")}
              className={`inline-block px-5 py-[10px] text-[15px] font-bold rounded-[5px] mx-[5px] mb-[10px] transition-all duration-300 ${
                activeTab === "bathrooms"
                  ? "bg-primary-dark text-white border-0"
                  : "bg-white text-black border border-primary-dark hover:bg-gray-100"
              }`}
            >
              Bathrooms
            </button>
            <button
              onClick={() => setActiveTab("bedrooms")}
              className={`inline-block px-5 py-[10px] text-[15px] font-bold rounded-[5px] mx-[5px] mb-[10px] transition-all duration-300 ${
                activeTab === "bedrooms"
                  ? "bg-primary-dark text-white border-0"
                  : "bg-white text-black border border-primary-dark hover:bg-gray-100"
              }`}
            >
              Bedrooms
            </button>
            <button
              onClick={() => setActiveTab("common")}
              className={`inline-block px-5 py-[10px] text-[15px] font-bold rounded-[5px] mx-[5px] mb-[10px] transition-all duration-300 ${
                activeTab === "common"
                  ? "bg-primary-dark text-white border-0"
                  : "bg-white text-black border border-primary-dark hover:bg-gray-100"
              }`}
            >
              Common Areas
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0)] hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] transition-shadow h-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 m-0">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-5 font-semibold text-gray-900 border border-gray-200">
                      Task
                    </th>
                    <th className="text-center py-3 px-5 font-semibold text-gray-900 border border-gray-200">
                      Routine Clean
                    </th>
                    <th className="text-center py-3 px-5 font-semibold text-gray-900 border border-gray-200">
                      Deep Clean
                    </th>
                    <th className="text-center py-3 px-5 font-semibold text-gray-900 border border-gray-200">
                      Move-In/Out
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checklistData[activeTab].map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-5 text-sm text-gray-700 border border-gray-200">
                        {item.task}
                      </td>
                      <td className="py-3 px-5 text-center border border-gray-200">
                        {item.routine ? (
                          <span className="text-[#169256] font-bold">✓</span>
                        ) : (
                          <span className="text-[#ce2e1d] font-bold">✗</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center border border-gray-200">
                        {item.deep ? (
                          <span className="text-[#169256] font-bold">✓</span>
                        ) : (
                          <span className="text-[#ce2e1d] font-bold">✗</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center border border-gray-200">
                        {item.moveInOut ? (
                          <span className="text-[#169256] font-bold">✓</span>
                        ) : (
                          <span className="text-[#ce2e1d] font-bold">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

const checklistData: Record<
  string,
  Array<{ task: string; routine: boolean; deep: boolean; moveInOut: boolean }>
> = {
  kitchen: [
    { task: "Remove cobwebs", routine: true, deep: true, moveInOut: true },
    { task: "Dust light fixtures", routine: true, deep: true, moveInOut: true },
    {
      task: "Dust all windowsills, window frames, & ledges",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    { task: "Dust ceiling fans", routine: true, deep: true, moveInOut: true },
    {
      task: "Dry dust decor and picture frames",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean & dry sink & soap dish",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean countertops & backsplash",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean microwave (inside & outside)",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean stovetop, burners, & control panels",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean exteriors of large appliances (fridge, oven, dishwasher)",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean stationary items (toaster, coffee maker, etc.)",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down table & chairs",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean all light switches & doorknobs",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Spot clean cabinets & clean all handles",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Empty trash can & wipe down exterior",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Vacuum / Sweep / Mop Floors",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down all doors & door frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean oven hood vent",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down windowsills and window frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down exteriors of all cabinets and drawers",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down baseboards",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down insides of cabinets & drawers",
      routine: false,
      deep: false,
      moveInOut: true,
    },
    {
      task: "Sweep/vacuum/mop pantry floor & wipe down shelves",
      routine: false,
      deep: false,
      moveInOut: true,
    },
  ],
  bathrooms: [
    { task: "Remove cobwebs", routine: true, deep: true, moveInOut: true },
    { task: "Dust light fixtures", routine: true, deep: true, moveInOut: true },
    {
      task: "Dust all windowsills, window frames, & ledges",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    { task: "Dust ceiling fans", routine: true, deep: true, moveInOut: true },
    { task: "Clean mirrors", routine: true, deep: true, moveInOut: true },
    {
      task: "Clean & sanitize toilet",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean & sanitize sink & faucet",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean shower/tub & fixtures",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down countertops",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean all light switches & doorknobs",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Empty trash can & wipe down exterior",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Vacuum / Sweep / Mop Floors",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down all doors & door frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Scrub grout & tile",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down baseboards",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down cabinet exteriors",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    { task: "Wipe down walls", routine: false, deep: true, moveInOut: true },
  ],
  bedrooms: [
    { task: "Remove cobwebs", routine: true, deep: true, moveInOut: true },
    { task: "Dust light fixtures", routine: true, deep: true, moveInOut: true },
    {
      task: "Dust all windowsills, window frames, & ledges",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    { task: "Dust ceiling fans", routine: true, deep: true, moveInOut: true },
    {
      task: "Dry dust decor and picture frames",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Dust furniture surfaces",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean all light switches & doorknobs",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    { task: "Empty trash cans", routine: true, deep: true, moveInOut: true },
    {
      task: "Vacuum / Sweep / Mop Floors",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down all doors & door frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean baseboards",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down windowsills and window frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    { task: "Wipe down walls", routine: false, deep: true, moveInOut: true },
  ],
  common: [
    { task: "Remove cobwebs", routine: true, deep: true, moveInOut: true },
    { task: "Dust light fixtures", routine: true, deep: true, moveInOut: true },
    {
      task: "Dust all windowsills, window frames, & ledges",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    { task: "Dust ceiling fans", routine: true, deep: true, moveInOut: true },
    {
      task: "Dry dust decor and picture frames",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Dust furniture surfaces",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down tables & chairs",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean all light switches & doorknobs",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    { task: "Empty trash cans", routine: true, deep: true, moveInOut: true },
    {
      task: "Vacuum / Sweep / Mop Floors",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Vacuum upholstery",
      routine: true,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down all doors & door frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Clean baseboards",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    {
      task: "Wipe down windowsills and window frames",
      routine: false,
      deep: true,
      moveInOut: true,
    },
    { task: "Wipe down walls", routine: false, deep: true, moveInOut: true },
  ],
};
