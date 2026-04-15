import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppNav } from "@/components/app-nav";
import { AppPrefetcher } from "@/components/app-prefetcher";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <AppPrefetcher />
      <AppHeader />
      <AppNav />
      <main className="pt-16 pb-20 lg:ml-[220px] lg:pb-0">{children}</main>
    </div>
  );
}
