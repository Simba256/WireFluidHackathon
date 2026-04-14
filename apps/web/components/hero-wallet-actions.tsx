"use client";

import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useAuth } from "@/components/auth-provider";

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

export function HeroWalletActions() {
  const { address, error, isAuthenticated } = useAuth();

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <ConnectWalletButton
          authenticatedLabel={
            isAuthenticated && address
              ? `Linked ${address.slice(0, 6)}...${address.slice(-4)}`
              : "Wallet Linked"
          }
          className="flex items-center justify-center gap-3 rounded-full bg-primary px-10 py-5 font-headline text-xl font-bold text-on-primary shadow-[0_10px_40px_rgba(84,233,138,0.3)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100"
          icon={<Icon name="rocket_launch" />}
        />

        <Link
          href="/leaderboard"
          className="rounded-full border border-outline-variant bg-surface-container-high px-10 py-5 font-headline text-xl font-bold text-on-surface text-center transition-colors hover:bg-surface-bright"
        >
          View Leaderboard
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-bold text-secondary">{error}</p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Connect, switch to WireFluid, then sign once to link your wallet.
        </p>
      )}
    </div>
  );
}
