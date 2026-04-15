"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  APP_NAME,
  BNDY_DECIMALS,
  type DashboardChainStateDTO,
} from "@boundaryline/shared";
import { useAuth } from "@/components/auth-provider";
import { ProfilePopover } from "@/components/profile-popover";
import { apiFetch } from "@/lib/api-client";

function Icon({
  name,
  className,
  fill,
}: {
  name: string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

function formatWeiInteger(value: string): string {
  try {
    const decimal = formatUnits(BigInt(value), BNDY_DECIMALS);
    const integer = decimal.split(".")[0] ?? "0";
    return Number(integer).toLocaleString("en-US");
  } catch {
    return "0";
  }
}

export function AppHeader() {
  const { isAuthenticated } = useAuth();
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setWalletBalance(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<DashboardChainStateDTO>("/api/dashboard/chain-state")
      .then((data) => {
        if (cancelled) return;
        setWalletBalance(data.balances.walletBalance);
      })
      .catch(() => {
        if (cancelled) return;
        setWalletBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#161d26] px-6 py-4">
      <Link
        className="font-headline text-2xl font-bold tracking-tighter text-primary"
        href="/"
      >
        {APP_NAME}
      </Link>

      <div className="flex items-center gap-4">
        {isAuthenticated && (loading || walletBalance != null) ? (
          <div className="flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container px-3 py-1.5">
            <Icon
              fill
              className="text-sm text-primary"
              name="account_balance_wallet"
            />
            {loading ? (
              <span className="block h-4 w-24 animate-pulse rounded bg-primary/20" />
            ) : (
              <span className="font-headline text-sm font-bold text-primary">
                BNDY {formatWeiInteger(walletBalance ?? "0")}
              </span>
            )}
          </div>
        ) : null}
        {isAuthenticated ? <ProfilePopover /> : null}
      </div>
    </header>
  );
}
