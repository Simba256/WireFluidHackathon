"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  BNDY_DECIMALS,
  MIN_EARNED_TO_CLAIM_BNDY,
  type TierName,
} from "@boundaryline/shared";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";

type Tab = "global" | "prize";

interface GlobalEntry {
  rank: number;
  wallet: string;
  username: string | null;
  avatarUrl: string | null;
  totalPoints: number;
}

interface GlobalResponse {
  entries: GlobalEntry[];
  totalPlayers: number;
  updatedAt: string;
}

interface PrizeEntry {
  rank: number;
  wallet: string;
  username: string | null;
  avatarUrl: string | null;
  walletBalance: string;
  earnedBalance: string;
  tierEligible: TierName | null;
  canClaim: boolean;
}

interface PrizeResponse {
  entries: PrizeEntry[];
  totalQualified: number;
  snapshotBlock: number;
  updatedAt: string;
}

const TIER_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  RANK_1: {
    label: "Rank 1",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    icon: "emoji_events",
  },
  TOP_3: {
    label: "Top 3",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    icon: "military_tech",
  },
  TOP_10: {
    label: "Top 10",
    color: "text-slate-300",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
    icon: "workspace_premium",
  },
  TOP_25: {
    label: "Top 25",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    icon: "star",
  },
  TOP_50: {
    label: "Top 50",
    color: "text-slate-400",
    bg: "bg-white/5",
    border: "border-white/10",
    icon: "star_half",
  },
};

function tierForRank(rank: number): string | null {
  if (rank === 1) return "RANK_1";
  if (rank <= 3) return "TOP_3";
  if (rank <= 10) return "TOP_10";
  if (rank <= 25) return "TOP_25";
  if (rank <= 50) return "TOP_50";
  return null;
}

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

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBndy(wei: string): string {
  const n = Number(formatUnits(BigInt(wei), BNDY_DECIMALS));
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatPoints(pts: number): string {
  return pts.toLocaleString("en-US");
}

function PlayerAvatar({
  avatarUrl,
  username,
  wallet,
  size,
}: {
  avatarUrl: string | null;
  username: string | null;
  wallet: string;
  size: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  if (avatarUrl) {
    return (
      <div
        className={`${sizeClasses[size]} shrink-0 overflow-hidden rounded-full border border-white/10`}
      >
        <Image
          src={avatarUrl}
          alt={username ?? wallet}
          width={56}
          height={56}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : wallet.slice(2, 4).toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full bg-surface-container-highest font-headline font-bold text-on-surface-variant`}
    >
      {initials}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
        <Icon name="emoji_events" className="text-lg text-amber-950" fill />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-slate-300 to-slate-500 shadow-lg shadow-slate-400/20">
        <span className="font-headline text-sm font-black text-slate-900">
          2
        </span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/20">
        <span className="font-headline text-sm font-black text-orange-950">
          3
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-highest">
      <span className="font-headline text-sm font-bold text-on-surface-variant">
        {rank}
      </span>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const meta = TIER_META[tier];
  if (!meta) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${meta.bg} ${meta.border} ${meta.color}`}
    >
      <Icon name={meta.icon} className="text-sm" fill />
      {meta.label}
    </span>
  );
}

function TierSectionHeader({ tier }: { tier: string }) {
  const meta = TIER_META[tier];
  if (!meta) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={meta.icon} className={`text-xl ${meta.color}`} fill />
      <span
        className={`text-xs font-bold uppercase tracking-widest ${meta.color}`}
      >
        {meta.label}
      </span>
      <div className="flex-1 border-t border-white/5" />
    </div>
  );
}

function GlobalRow({
  entry,
  isCurrentUser,
}: {
  entry: GlobalEntry;
  isCurrentUser: boolean;
}) {
  const tier = tierForRank(entry.rank);

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${
        isCurrentUser
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-surface-container"
      }`}
    >
      <RankBadge rank={entry.rank} />
      <PlayerAvatar
        avatarUrl={entry.avatarUrl}
        username={entry.username}
        wallet={entry.wallet}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-headline text-sm font-bold text-on-surface">
            {entry.username ?? shortenAddress(entry.wallet)}
          </span>
          {isCurrentUser && (
            <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
              You
            </span>
          )}
        </div>
        {entry.username && (
          <p className="truncate font-mono text-xs text-on-surface-variant/60">
            {shortenAddress(entry.wallet)}
          </p>
        )}
      </div>
      {tier && (
        <div className="hidden sm:block">
          <TierBadge tier={tier} />
        </div>
      )}
      <div className="text-right">
        <span className="font-headline text-lg font-bold tabular-nums text-primary">
          {formatPoints(entry.totalPoints)}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
          Points
        </p>
      </div>
    </div>
  );
}

function PrizeRow({
  entry,
  isCurrentUser,
}: {
  entry: PrizeEntry;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${
        isCurrentUser
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-surface-container"
      }`}
    >
      <RankBadge rank={entry.rank} />
      <PlayerAvatar
        avatarUrl={entry.avatarUrl}
        username={entry.username}
        wallet={entry.wallet}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-headline text-sm font-bold text-on-surface">
            {entry.username ?? shortenAddress(entry.wallet)}
          </span>
          {isCurrentUser && (
            <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
              You
            </span>
          )}
        </div>
        {entry.username && (
          <p className="truncate font-mono text-xs text-on-surface-variant/60">
            {shortenAddress(entry.wallet)}
          </p>
        )}
      </div>

      {entry.tierEligible && (
        <div className="hidden sm:block">
          <TierBadge tier={entry.tierEligible} />
        </div>
      )}

      <div className="hidden text-right md:block">
        <span className="font-headline text-sm font-bold tabular-nums text-on-surface-variant">
          {formatBndy(entry.earnedBalance)}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
          Earned
        </p>
      </div>

      <div className="text-right">
        <span className="font-headline text-lg font-bold tabular-nums text-primary">
          {formatBndy(entry.walletBalance)}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
          Balance
        </p>
      </div>

      {entry.canClaim && (
        <div className="hidden lg:block">
          <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
            <Icon name="check_circle" className="text-sm" fill />
            Claimable
          </span>
        </div>
      )}
    </div>
  );
}

function Podium({ entries }: { entries: GlobalEntry[] }) {
  const [second, first, third] = [entries[1], entries[0], entries[2]];
  if (!first) return null;

  const podiumEntries = [
    {
      entry: second,
      height: "h-28",
      medal: "silver" as const,
      order: "order-1",
    },
    { entry: first, height: "h-36", medal: "gold" as const, order: "order-2" },
    {
      entry: third,
      height: "h-24",
      medal: "bronze" as const,
      order: "order-3",
    },
  ];

  const medalColors = {
    gold: "from-amber-400 to-amber-600 shadow-amber-500/20",
    silver: "from-slate-300 to-slate-500 shadow-slate-400/20",
    bronze: "from-orange-400 to-orange-600 shadow-orange-500/20",
  };

  return (
    <div className="flex items-end justify-center gap-3 pb-4 sm:gap-6">
      {podiumEntries.map(({ entry, height, medal, order }) => {
        if (!entry) return <div key={medal} className={`w-28 ${order}`} />;

        return (
          <div
            key={medal}
            className={`flex flex-col items-center gap-3 ${order}`}
          >
            <PlayerAvatar
              avatarUrl={entry.avatarUrl}
              username={entry.username}
              wallet={entry.wallet}
              size="lg"
            />
            <span className="max-w-[100px] truncate text-center font-headline text-sm font-bold text-on-surface">
              {entry.username ?? shortenAddress(entry.wallet)}
            </span>
            <span className="font-headline text-xs font-bold tabular-nums text-primary">
              {formatPoints(entry.totalPoints)} pts
            </span>
            <div
              className={`${height} w-24 rounded-t-2xl bg-linear-to-b ${medalColors[medal]} shadow-lg flex items-start justify-center pt-3 sm:w-28`}
            >
              <span className="font-headline text-2xl font-black text-white/90">
                #{entry.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-surface-container-highest">
        <Icon
          name={tab === "global" ? "trophy" : "military_tech"}
          className="text-4xl text-on-surface-variant"
        />
      </div>
      <h3 className="mb-2 font-headline text-xl font-bold text-on-surface">
        {tab === "global" ? "No rankings yet" : "No qualified players yet"}
      </h3>
      <p className="max-w-sm text-sm text-on-surface-variant">
        {tab === "global"
          ? "Pick a team and start earning points from live PSL matches to appear on the global leaderboard."
          : `Players need to earn and sync at least ${MIN_EARNED_TO_CLAIM_BNDY.toLocaleString()} BNDY on-chain to appear on the prize leaderboard.`}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 px-4 py-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl bg-surface-container-low px-4 py-3"
        >
          <div className="h-9 w-9 animate-pulse rounded-xl bg-surface-container-highest" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-container-highest" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-container-highest" />
            <div className="h-3 w-20 animate-pulse rounded bg-surface-container-highest" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded bg-surface-container-highest" />
        </div>
      ))}
    </div>
  );
}

function groupByTier<T extends { rank: number }>(
  entries: T[],
): Array<{ tier: string | null; entries: T[] }> {
  const groups: Array<{ tier: string | null; entries: T[] }> = [];
  let currentTier: string | null = null;
  let currentGroup: T[] = [];

  for (const entry of entries) {
    const tier = tierForRank(entry.rank);
    if (tier !== currentTier) {
      if (currentGroup.length > 0) {
        groups.push({ tier: currentTier, entries: currentGroup });
      }
      currentTier = tier;
      currentGroup = [entry];
    } else {
      currentGroup.push(entry);
    }
  }
  if (currentGroup.length > 0) {
    groups.push({ tier: currentTier, entries: currentGroup });
  }

  return groups;
}

export function LeaderboardPage() {
  const { address, token } = useAuth();
  const [tab, setTab] = useState<Tab>("global");
  const [globalData, setGlobalData] = useState<GlobalResponse | null>(null);
  const [prizeData, setPrizeData] = useState<PrizeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobal = useCallback(async () => {
    const data = await apiFetch<GlobalResponse>(
      "/api/leaderboard/global?limit=100",
    );
    setGlobalData(data);
  }, []);

  const fetchPrize = useCallback(async () => {
    const data = await apiFetch<PrizeResponse>(
      "/api/leaderboard/prize?limit=100",
    );
    setPrizeData(data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "global") {
        await fetchGlobal();
      } else {
        await fetchPrize();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard",
      );
    } finally {
      setLoading(false);
    }
  }, [tab, fetchGlobal, fetchPrize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab !== "prize") return;
    const interval = setInterval(() => {
      fetchPrize().catch(() => {});
    }, 5_000);
    return () => clearInterval(interval);
  }, [tab, fetchPrize]);

  const walletLower = address?.toLowerCase() ?? null;

  const globalGroups = useMemo(
    () => (globalData ? groupByTier(globalData.entries) : []),
    [globalData],
  );

  const prizeGroups = useMemo(
    () => (prizeData ? groupByTier(prizeData.entries) : []),
    [prizeData],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface sm:text-5xl">
          Leaderboard
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-2 rounded-2xl bg-surface-container-low p-1.5">
        <button
          onClick={() => setTab("global")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            tab === "global"
              ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Icon name="public" className="text-lg" />
          Global
        </button>
        <button
          onClick={() => setTab("prize")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            tab === "prize"
              ? "bg-secondary text-on-secondary shadow-lg shadow-secondary/20"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Icon name="military_tech" className="text-lg" />
          Prize
        </button>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {tab === "global" && globalData && (
            <>
              <StatCard
                icon="group"
                label="Total Players"
                value={globalData.totalPlayers.toLocaleString()}
              />
              <StatCard
                icon="update"
                label="Last Updated"
                value={new Date(globalData.updatedAt).toLocaleTimeString()}
              />
            </>
          )}
          {tab === "prize" && prizeData && (
            <>
              <StatCard
                icon="verified"
                label="Qualified"
                value={prizeData.totalQualified.toLocaleString()}
              />
              <StatCard
                icon="deployed_code"
                label="Block"
                value={`#${prizeData.snapshotBlock.toLocaleString()}`}
              />
            </>
          )}
        </div>
      )}

      {/* Info banner for prize tab */}
      {tab === "prize" && !loading && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
          <Icon
            name="info"
            className="mt-0.5 shrink-0 text-xl text-secondary"
          />
          <div className="text-sm text-on-surface-variant">
            <span className="font-bold text-secondary">Prize leaderboard</span>{" "}
            ranks by on-chain wallet balance (BNDY). Only wallets with{" "}
            <span className="font-bold text-on-surface">
              {MIN_EARNED_TO_CLAIM_BNDY.toLocaleString()}+ BNDY earned
            </span>{" "}
            are eligible.
          </div>
        </div>
      )}

      {/* Content */}
      <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-low">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon name="error" className="mb-4 text-4xl text-error" />
            <p className="text-sm text-error">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-xl bg-surface-container-highest px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-bright"
            >
              Retry
            </button>
          </div>
        ) : tab === "global" ? (
          globalData && globalData.entries.length > 0 ? (
            <div>
              {globalData.entries.length >= 3 && (
                <div className="border-b border-white/5 bg-surface-container/50 px-4 pt-8">
                  <Podium entries={globalData.entries.slice(0, 3)} />
                </div>
              )}
              <div className="divide-y divide-white/5 px-2 py-2">
                {globalGroups.map((group) => (
                  <div key={group.tier ?? "unranked"}>
                    {group.tier && <TierSectionHeader tier={group.tier} />}
                    <div className="space-y-1">
                      {group.entries.map((entry) => (
                        <GlobalRow
                          key={entry.wallet}
                          entry={entry}
                          isCurrentUser={entry.wallet === walletLower}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState tab="global" />
          )
        ) : prizeData && prizeData.entries.length > 0 ? (
          <div className="divide-y divide-white/5 px-2 py-2">
            {prizeGroups.map((group) => (
              <div key={group.tier ?? "unranked"}>
                {group.tier && <TierSectionHeader tier={group.tier} />}
                <div className="space-y-1">
                  {group.entries.map((entry) => (
                    <PrizeRow
                      key={entry.wallet}
                      entry={entry}
                      isCurrentUser={entry.wallet === walletLower}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState tab="prize" />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon: string;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 ${className ?? ""}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest">
        <Icon name={icon} className="text-lg text-on-surface-variant" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
          {label}
        </p>
        <p className="font-headline text-sm font-bold text-on-surface">
          {value}
        </p>
      </div>
    </div>
  );
}
