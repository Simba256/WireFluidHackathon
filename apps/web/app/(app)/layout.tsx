import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <AppHeader />
      <AppNav />
      <main className="pt-16 pb-20 lg:ml-[220px] lg:pb-0">{children}</main>
    </div>
  );
}
