"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useAuth } from "@/components/auth-provider";
import { ProfilePopover } from "@/components/profile-popover";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/prizes", label: "Prizes" },
] as const;

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function LandingNav() {
  const pathname = usePathname();
  const { address, isAuthenticated, status } = useAuth();

  const walletLabel = address
    ? shortenAddress(address)
    : status === "connecting"
      ? "Awaiting wallet"
      : "Not linked";

  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0e141b] px-6 py-4">
      <Link href="/" className="font-headline text-2xl font-bold tracking-tighter text-primary">
        BoundaryLine
      </Link>

      <div className="hidden items-center gap-8 font-headline tracking-tight md:flex">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "border-b-2 border-primary pb-1 text-primary transition-colors"
                  : "text-slate-400 transition-colors hover:text-primary"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end sm:flex">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Wallet
          </span>
          <span className="font-mono text-sm font-bold text-primary">
            {walletLabel}
          </span>
        </div>

        <ConnectWalletButton
          authenticatedLabel="Wallet Linked"
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          idleLabel="Connect"
          icon={<Icon className="text-base" name="account_balance_wallet" />}
          linkedLabel="Link Wallet"
        />

        {isAuthenticated ? <ProfilePopover /> : null}
      </div>
    </nav>
  );
}
