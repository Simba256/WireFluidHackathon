import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="pb-20 lg:ml-[220px] lg:pb-0">{children}</main>
    </div>
  );
}
