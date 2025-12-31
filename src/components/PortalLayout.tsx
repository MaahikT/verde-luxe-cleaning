import { ReactNode } from "react";
import { PortalSidebar } from "./PortalSidebar";

interface PortalLayoutProps {
  children: ReactNode;
  portalType: "admin" | "cleaner" | "client";
}

export function PortalLayout({ children, portalType }: PortalLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[#EAE9E3]">
      <PortalSidebar portalType={portalType} />
      
      {/* Main content area with left margin for sidebar on desktop */}
      <main className="flex-grow lg:ml-40 min-h-screen">
        {children}
      </main>
    </div>
  );
}
