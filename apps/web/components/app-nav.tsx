"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ProfilePopover } from "@/components/profile-popover";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
  { href: "/play", label: "Play", icon: "bolt" },
  { href: "/leaderboard", label: "Rankings", icon: "trophy" },
  { href: "/prizes", label: "Prizes", icon: "payments" },
  { href: "/trophies", label: "Awards", icon: "stars" },
] as const;

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AppNav() {
  const pathname = usePathname();
  const { address, isAuthenticated } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-[220px] flex-col border-r border-outline-variant/20 bg-surface-container-low lg:flex">
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${active ? "text-primary" : ""}`}
                  style={
                    active ? { fontVariationSettings: "'FILL' 1" } : undefined
                  }
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isAuthenticated && address ? (
          <div className="flex items-center gap-3 border-t border-outline-variant/20 px-4 py-4">
            <ProfilePopover />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                Wallet
              </div>
              <div className="mt-0.5 truncate font-mono text-xs font-bold text-primary">
                {shortenAddress(address)}
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-outline-variant/20 bg-surface-container-low lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex touch-manipulation select-none flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-semibold transition-colors ${
                active
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined pointer-events-none text-[22px] ${active ? "text-primary" : ""}`}
                style={
                  active ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                {item.icon}
              </span>
              <span className="pointer-events-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
