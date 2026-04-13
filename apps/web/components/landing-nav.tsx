"use client";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useAuth } from "@/components/auth-provider";

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
  const { address, isAuthenticated, logout, status } = useAuth();

  const walletLabel = address
    ? shortenAddress(address)
    : status === "connecting"
      ? "Awaiting wallet"
      : "Not linked";

  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0e141b] px-6 py-4">
      <div className="font-headline text-2xl font-bold tracking-tighter text-primary">
        BoundaryLine
      </div>

      <div className="hidden items-center gap-8 font-headline tracking-tight md:flex">
        <a
          className="border-b-2 border-primary pb-1 text-primary transition-colors"
          href="#"
        >
          Dashboard
        </a>
        <a
          className="text-slate-400 transition-colors hover:text-primary"
          href="#"
        >
          Play
        </a>
        <a
          className="text-slate-400 transition-colors hover:text-primary"
          href="#"
        >
          Leaderboard
        </a>
        <a
          className="text-slate-400 transition-colors hover:text-primary"
          href="#"
        >
          Prizes
        </a>
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

        {isAuthenticated ? (
          <button
            className="text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-secondary"
            onClick={() => {
              void logout();
            }}
            type="button"
          >
            Unlink
          </button>
        ) : null}
      </div>
    </nav>
  );
}
