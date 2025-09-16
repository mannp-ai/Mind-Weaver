
"use client";

import Sidebar, { MobileSidebar } from "@/components/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded } = useSidebar();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MobileSidebar />
      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "md:ml-64" : "md:ml-20"
        )}
      >
        {children}
      </main>
    </div>
  );
}
