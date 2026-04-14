"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

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
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col border-r border-outline-variant/20 bg-surface-container-low lg:flex">
        <Link
          href="/"
          className="flex h-16 items-center px-6 font-headline text-xl font-bold tracking-tighter text-primary"
        >
          BoundaryLine
        </Link>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
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
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isAuthenticated && address ? (
          <div className="border-t border-outline-variant/20 px-4 py-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              Wallet
            </div>
            <div className="mt-0.5 font-mono text-xs font-bold text-primary">
              {shortenAddress(address)}
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
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-semibold transition-colors ${
                active
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] ${active ? "text-primary" : ""}`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
