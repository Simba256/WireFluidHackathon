"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  BNDY_DECIMALS,
  CONTRACT_ADDRESSES,
  TIERS_BY_ID,
  explorerTokenUrl,
  type TierId,
  type TrophiesResponseDTO,
  type TrophyDTO,
} from "@boundaryline/shared";
import { useAuth } from "@/components/auth-provider";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { ApiClientError, apiFetch } from "@/lib/api-client";

const TIER_ACCENT: Record<TierId, { pill: string; glow: string; border: string }> = {
  1: {
    pill: "bg-secondary/20 text-secondary border-secondary/30",
    glow: "drop-shadow-[0_0_28px_rgba(219,118,25,0.45)]",
    border: "from-secondary/15",
  },
  2: {
    pill: "bg-primary/20 text-primary border-primary/30",
    glow: "drop-shadow-[0_0_24px_rgba(84,233,138,0.4)]",
    border: "from-primary/15",
  },
  3: {
    pill: "bg-primary/15 text-primary border-primary/20",
    glow: "drop-shadow-[0_0_20px_rgba(84,233,138,0.3)]",
    border: "from-primary/10",
  },
  4: {
    pill: "bg-tertiary/20 text-tertiary border-tertiary/30",
    glow: "drop-shadow-[0_0_18px_rgba(196,208,221,0.25)]",
    border: "from-tertiary/10",
  },
  5: {
    pill: "bg-on-surface-variant/15 text-on-surface-variant border-on-surface-variant/25",
    glow: "drop-shadow-[0_0_16px_rgba(187,203,187,0.2)]",
    border: "from-on-surface-variant/10",
  },
};

const MINT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatMintDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return MINT_DATE_FORMAT.format(new Date(iso)).toUpperCase();
  } catch {
    return "—";
  }
}

function formatBurnedTotal(trophies: TrophyDTO[]): string {
  const total = trophies.reduce<bigint>((sum, t) => {
    if (!t.burnedAmount) return sum;
    try {
      return sum + BigInt(t.burnedAmount);
    } catch {
      return sum;
    }
  }, 0n);

  if (total === 0n) return "—";

  const whole = Number(formatUnits(total, BNDY_DECIMALS).split(".")[0] ?? "0");
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(whole);
}

function highestTierLabel(trophies: TrophyDTO[]): string {
  if (trophies.length === 0) return "—";
  const minTierId = trophies.reduce((min, t) => Math.min(min, t.tierId), Infinity);
  return TIERS_BY_ID[minTierId as TierId]?.displayName ?? "—";
}

export function TrophiesPage() {
  const { isAuthenticated, address, token } = useAuth();
  const [trophies, setTrophies] = useState<TrophyDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTrophies = useCallback(async () => {
    if (!address || !token) {
      setTrophies(null);
      return;
    }
    setLoadError(null);
    try {
      const response = await apiFetch<TrophiesResponseDTO>(
        `/api/trophies/${address}`,
        { token },
      );
      setTrophies(response.trophies);
    } catch (err) {
      setTrophies([]);
      setLoadError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to load trophies",
      );
    }
  }, [address, token]);

  useEffect(() => {
    if (isAuthenticated && address && token) {
      void loadTrophies();
    } else {
      setTrophies(null);
    }
  }, [isAuthenticated, address, token, loadTrophies]);

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 lg:pt-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <header className="relative mb-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative z-10">
            <h1 className="mb-4 font-headline text-5xl font-bold tracking-tighter text-on-surface md:text-7xl">
              Trophy <span className="italic text-primary">Showcase</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-on-surface-variant">
              A permanent record of your dominance on the WireFluid pitch. Each
              soulbound NFT represents a verified tournament victory earned
              during the PSL 2026 Season.
            </p>
          </div>
        </header>

        {!isAuthenticated ? (
          <SignInPrompt />
        ) : trophies === null ? (
          <TrophyGridSkeleton />
        ) : trophies.length === 0 ? (
          <EmptyState error={loadError} />
        ) : (
          <>
            <TrophyGrid trophies={trophies} />
            <CollectionSummary trophies={trophies} />
          </>
        )}
      </div>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-white/5 bg-surface-container p-10 text-center">
      <p className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        Sign in to view your awards
      </p>
      <p className="text-sm leading-relaxed text-on-surface-variant">
        Your soulbound trophies are tied to your wallet. Connect and sign in to
        view the NFTs you&apos;ve minted.
      </p>
      <ConnectWalletButton className="rounded-full bg-primary px-8 py-3 font-headline text-xs font-black uppercase tracking-widest text-on-primary transition-all hover:scale-[1.02] active:scale-95" />
    </div>
  );
}

function TrophyGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[520px] animate-pulse rounded-3xl border border-white/5 bg-surface-container-low"
        />
      ))}
    </div>
  );
}

function EmptyState({ error }: { error: string | null }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-3xl border-2 border-dashed border-on-surface-variant/20 bg-surface-container-low/50 p-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-high">
        <span
          className="material-symbols-outlined text-4xl text-on-surface-variant"
          aria-hidden
        >
          lock
        </span>
      </div>
      <div>
        <h3 className="mb-2 font-headline text-2xl font-bold text-on-surface-variant">
          Victory Awaits
        </h3>
        <p className="max-w-[260px] text-sm leading-relaxed text-on-surface-variant/80">
          Qualify on the prize leaderboard and claim a tier to mint your first
          soulbound trophy.
        </p>
      </div>
      <Link
        href="/prizes"
        className="rounded-full border border-primary/40 px-6 py-2 font-headline text-xs font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/10"
      >
        View Prizes
      </Link>
      {error ? (
        <p className="text-xs text-error/80">{error}</p>
      ) : null}
    </div>
  );
}

function TrophyGrid({ trophies }: { trophies: TrophyDTO[] }) {
  const sorted = useMemo(
    () => [...trophies].sort((a, b) => a.tierId - b.tierId),
    [trophies],
  );

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((trophy) => (
        <TrophyCard key={trophy.tokenId} trophy={trophy} />
      ))}
    </div>
  );
}

function TrophyCard({ trophy }: { trophy: TrophyDTO }) {
  const tier = TIERS_BY_ID[trophy.tierId];
  const accent = TIER_ACCENT[trophy.tierId];
  const tokenLabel = `#${String(trophy.tokenId).padStart(3, "0")}/PSL26`;
  const mintDate = formatMintDate(trophy.mintedAt);
  const explorerHref = explorerTokenUrl(
    CONTRACT_ADDRESSES.PSLTrophies,
    trophy.tokenId,
  );

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-surface-container-low shadow-2xl transition-all duration-500 hover:-translate-y-1">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60 ${accent.border}`}
      />
      <div className="relative z-10 flex h-full flex-col p-8">
        <div className="mb-10 flex items-start justify-between">
          <div
            className={`rounded-full border px-3 py-1 ${accent.pill}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {tier?.displayName ?? "Trophy"} Tier
            </span>
          </div>
          <span className="font-headline text-xs font-bold text-on-surface-variant/70">
            {tokenLabel}
          </span>
        </div>

        <div className="relative mb-10 flex justify-center">
          <div className="pointer-events-none absolute inset-0 scale-50 rounded-full bg-primary/10 blur-[80px]" />
          <Image
            src={`/prizes/tier-${trophy.tierId}-v5.png`}
            alt={`${tier?.displayName ?? "Trophy"} prize image`}
            width={240}
            height={320}
            className={`h-64 w-48 object-contain transition-transform duration-700 group-hover:scale-105 ${accent.glow}`}
          />
        </div>

        <div className="mt-auto space-y-6">
          <div>
            <h2 className="mb-2 font-headline text-3xl font-black uppercase leading-none tracking-tight text-on-surface">
              {tier?.displayName ?? "Trophy"}
            </h2>
            <p className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant">
              PSL 2026 Season
            </p>
          </div>
          <div className="flex items-end justify-between border-t border-white/5 pt-6">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
                Mint Date
              </p>
              <p className="font-headline text-sm font-bold text-on-surface">
                {mintDate}
              </p>
            </div>
            <a
              href={explorerHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm font-bold text-primary transition-all hover:underline"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden>
                open_in_new
              </span>
              View Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionSummary({ trophies }: { trophies: TrophyDTO[] }) {
  const total = String(trophies.length).padStart(2, "0");
  const burned = formatBurnedTotal(trophies);
  const highest = highestTierLabel(trophies);

  return (
    <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
      <SummaryCard label="Total Trophies" value={total} tone="primary" />
      <SummaryCard
        label="BNDY Burned"
        value={burned === "—" ? "—" : `${burned} BNDY`}
        tone="on-surface"
      />
      <SummaryCard label="Highest Tier" value={highest} tone="secondary" />
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "secondary" | "on-surface";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "secondary"
        ? "text-secondary"
        : "text-on-surface";
  return (
    <div className="rounded-2xl border border-white/5 bg-surface-container/60 p-6">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className={`font-headline text-4xl font-black ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
