"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  APP_NAME,
  BNDY_DECIMALS,
  CONTRACT_ADDRESSES,
  PSLPointsAbi,
  explorerTxUrl,
  type DashboardChainStateDTO,
  type DashboardGlobalDTO,
  type DashboardSummaryDTO,
} from "@boundaryline/shared";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { ProfilePopover } from "@/components/profile-popover";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, ApiClientError } from "@/lib/api-client";

type TxAction = "sync" | "claim";

interface SyncVoucherResponse {
  voucher: {
    user: string;
    amount: string;
    nonce: string;
  };
  signature: `0x${string}`;
}

interface ClaimVoucherResponse {
  voucher: {
    user: string;
    tierId: number;
    nonce: string;
  };
  signature: `0x${string}`;
}

interface TransactionState {
  action: TxAction | null;
  error: string | null;
  hash: `0x${string}` | null;
  nonce: string | null;
  stage:
    | "idle"
    | "requesting"
    | "awaiting_wallet"
    | "pending"
    | "success"
    | "error";
}

const SIDE_NAV_ITEMS = [
  { icon: "dashboard", label: "Dashboard", current: true },
  { icon: "sports_cricket", label: "Play", current: false },
  { icon: "leaderboard", label: "Leaderboard", current: false },
  { icon: "emoji_events", label: "Prizes", current: false },
  { icon: "military_tech", label: "Trophies", current: false },
] as const;

const MOBILE_NAV_ITEMS = [
  { icon: "grid_view", label: "Dashboard", current: true },
  { icon: "bolt", label: "Play", current: false },
  { icon: "trophy", label: "Rankings", current: false },
  { icon: "payments", label: "Prizes", current: false },
  { icon: "stars", label: "Awards", current: false },
] as const;

function Icon({
  fill = false,
  name,
  className,
}: {
  fill?: boolean;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
    >
      {name}
    </span>
  );
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatIntegerString(value: string): string {
  const normalized = value.replace(/^0+(?=\d)/, "") || "0";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatWeiInteger(value: string): string {
  return formatIntegerString(
    formatUnits(BigInt(value), BNDY_DECIMALS).split(".")[0] ?? "0",
  );
}

function formatRank(rank: number | null): string {
  return rank == null ? "-" : `#${formatInteger(rank)}`;
}

function formatDateLabel(playedAt: string | null, scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(playedAt ?? scheduledAt));
}

function dashboardStatusLabel(
  dashboard: DashboardSummaryDTO,
  chainState: DashboardChainStateDTO | null,
): string {
  if (dashboard.claim?.status === "confirmed") {
    return "Claimed";
  }

  if (dashboard.claim?.status === "pending") {
    return "Claim Pending";
  }

  if (chainState?.prize.qualified) {
    return "Qualified";
  }

  if (dashboard.team.exists) {
    return "Active";
  }

  return "Not Drafted";
}

function matchStatusLabel(
  status: DashboardSummaryDTO["recentMatches"][number]["status"],
): string {
  if (status === "completed") {
    return "Scored";
  }

  if (status === "live") {
    return "Live";
  }

  return "Upcoming";
}

function compareMatchActivity(
  a: DashboardSummaryDTO["recentMatches"][number],
  b: DashboardSummaryDTO["recentMatches"][number],
): number {
  const statusOrder = (
    status: DashboardSummaryDTO["recentMatches"][number]["status"],
  ): number => {
    switch (status) {
      case "live":
        return 0;
      case "scheduled":
        return 1;
      case "completed":
      default:
        return 2;
    }
  };

  const orderDiff = statusOrder(a.status) - statusOrder(b.status);
  if (orderDiff !== 0) {
    return orderDiff;
  }

  if (a.status === "completed" && b.status === "completed") {
    return (
      new Date(b.playedAt ?? b.scheduledAt).getTime() -
      new Date(a.playedAt ?? a.scheduledAt).getTime()
    );
  }

  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}

function TeamLogoPuck({
  side,
}: {
  side: DashboardSummaryDTO["recentMatches"][number]["teamA"];
}) {
  return (
    <div
      className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high p-1 shadow-xl md:h-16 md:w-16"
      style={{
        boxShadow: `0 12px 30px ${side.accentColor}26`,
        outline: `1px solid ${side.accentColor}55`,
      }}
    >
      {side.logoPath ? (
        <Image
          src={side.logoPath}
          alt={side.name}
          fill
          className="object-contain p-1.5"
          sizes="64px"
        />
      ) : (
        <span
          className="font-headline text-base font-bold"
          style={{ color: side.accentColor }}
        >
          {side.shortCode}
        </span>
      )}
    </div>
  );
}

function BalanceSkeleton({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-pulse rounded-full bg-primary/15 ${className}`}
    />
  );
}

function MatchActivitySection({
  action,
  emptyDescription,
  emptyTitle,
  label,
  matches,
  title,
}: {
  action?: React.ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  label: string;
  matches: DashboardSummaryDTO["recentMatches"];
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h4 className="font-headline text-lg font-bold tracking-tight">
          {title}
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-primary">{label}</span>
          {action}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-[2rem] border border-outline-variant/15 bg-surface-container-low p-8">
          <p className="font-headline text-2xl font-bold text-on-surface">
            {emptyTitle}
          </p>
          <p className="mt-3 max-w-xl text-slate-300">{emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((matchItem) => (
            <div
              key={`${matchItem.status}-${matchItem.id}`}
              className="flex flex-col items-center gap-6 rounded-[2rem] bg-surface-container-low p-6 transition-colors hover:bg-surface-container-highest md:flex-row"
            >
              <div className="flex flex-1 items-center gap-4">
                <div className="flex -space-x-4">
                  {[matchItem.teamA, matchItem.teamB].map((side) => (
                    <TeamLogoPuck key={side.name} side={side} />
                  ))}
                </div>
                <div>
                  <h4 className="font-headline font-bold">
                    {matchItem.teamA.shortCode} vs {matchItem.teamB.shortCode}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {matchItem.venue ?? "Venue TBD"} -{" "}
                    {formatDateLabel(matchItem.playedAt, matchItem.scheduledAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Points
                  </p>
                  <p className="font-headline text-xl font-bold text-primary">
                    {matchItem.points != null
                      ? `+${formatInteger(matchItem.points)}`
                      : "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Status
                  </p>
                  <p className="font-headline text-xl font-bold text-on-surface">
                    {matchStatusLabel(matchItem.status)}
                  </p>
                </div>
                <Icon className="text-slate-600" name="chevron_right" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AppChrome({
  children,
  dashboard,
  isWalletBalanceLoading = false,
  walletBalance = null,
}: {
  children: React.ReactNode;
  dashboard: DashboardSummaryDTO;
  isWalletBalanceLoading?: boolean;
  walletBalance?: string | null;
}) {
  return (
    <>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#161d26] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            className="font-headline text-2xl font-bold tracking-tighter text-primary"
            href="/"
          >
            {APP_NAME}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {isWalletBalanceLoading || walletBalance != null ? (
            <div className="flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container px-3 py-1.5">
              <Icon
                fill
                className="text-sm text-primary"
                name="account_balance_wallet"
              />
              {isWalletBalanceLoading ? (
                <BalanceSkeleton className="h-4 w-24 bg-primary/20" />
              ) : (
                <span className="font-headline text-sm font-bold text-primary">
                  BNDY {formatWeiInteger(walletBalance ?? "0")}
                </span>
              )}
            </div>
          ) : null}
          <ProfilePopover />
        </div>
      </header>

      <div className="flex min-h-screen pt-16">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 flex-col bg-background py-8 shadow-2xl md:flex">
          <div className="mb-8 px-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Icon
                className="text-3xl text-on-primary"
                name="sports_cricket"
              />
            </div>
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-primary">
              {dashboard.tournament.seasonLabel}
            </h2>
            <p className="text-xs text-slate-500">
              {dashboard.tournament.subtitle}
            </p>
          </div>

          <nav className="flex-1 space-y-2">
            {SIDE_NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={
                  item.current
                    ? "flex translate-x-1 items-center gap-4 border-l-4 border-primary bg-gradient-to-r from-primary/20 to-transparent px-6 py-3 text-primary"
                    : "flex items-center gap-4 px-6 py-3 text-slate-400"
                }
              >
                <Icon name={item.icon} />
                <span className="font-headline font-medium">{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="mt-auto px-6">
            <button
              className="w-full rounded-full px-5 py-3 font-headline font-bold text-on-primary shadow-lg shadow-primary/20 pitch-gradient"
              type="button"
            >
              {dashboard.team.exists ? "Team Locked" : "Draft Team"}
            </button>
          </div>
        </aside>

        <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-24 pt-6 md:px-10 md:pb-10">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 z-50 flex h-20 w-full items-center justify-around rounded-t-3xl border-t border-white/10 bg-background/90 px-4 backdrop-blur-xl md:hidden">
        {MOBILE_NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex flex-col items-center justify-center ${item.current ? "scale-110 text-primary" : "text-slate-500"}`}
          >
            <Icon fill={item.current} name={item.icon} />
            <span className="mt-1 text-[10px] font-bold uppercase">
              {item.label}
            </span>
          </div>
        ))}
      </nav>

      <footer className="border-t border-outline-variant/5 bg-background px-8 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <p className="text-sm text-slate-500">
              © 2026 BoundaryLine. Powered by WireFluid Testnet.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <span>Tournament Rules</span>
            <span>Terms of Play</span>
            <span>Smart Contracts</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="glass-panel max-w-xl rounded-[2rem] border border-white/10 p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="text-4xl" name="account_balance_wallet" />
        </div>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
          Link your wallet to load the dashboard
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          BoundaryLine pulls your team, points, sync state, and prize standing
          from the backend and WireFluid testnet.
        </p>
        <div className="mt-8 flex justify-center">
          <ConnectWalletButton
            className="inline-flex items-center gap-3 rounded-full px-6 py-3 font-headline font-bold text-on-primary pitch-gradient"
            authenticatedLabel="Wallet Linked"
            icon={<Icon name="bolt" />}
            idleLabel="Connect Wallet"
            linkedLabel="Link Wallet"
          />
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 h-72 animate-pulse rounded-[2rem] bg-surface-container-low" />
        <div className="h-72 animate-pulse rounded-[2rem] bg-surface-container-high" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 animate-pulse rounded-[2rem] bg-surface-container" />
          <div className="h-48 animate-pulse rounded-[2rem] bg-surface-container" />
        </div>
        <div className="space-y-4 lg:col-span-3">
          <div className="h-32 animate-pulse rounded-[2rem] bg-surface-container-low" />
          <div className="h-32 animate-pulse rounded-[2rem] bg-surface-container-low" />
          <div className="h-32 animate-pulse rounded-[2rem] bg-surface-container-low" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-lg rounded-[2rem] border border-error/30 bg-error/10 p-8 text-center">
        <h2 className="font-headline text-3xl font-bold text-on-surface">
          Dashboard unavailable
        </h2>
        <p className="mt-4 text-slate-300">{error}</p>
        <button
          className="mt-6 rounded-full px-5 py-3 font-headline font-bold text-on-primary pitch-gradient"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function TransactionNotice({ tx }: { tx: TransactionState }) {
  if (tx.stage === "idle" || tx.action == null) {
    return null;
  }

  const label = tx.action === "sync" ? "Sync" : "Claim";
  const tone =
    tx.stage === "error"
      ? "border-error/40 bg-error/10"
      : "border-primary/20 bg-primary/10";
  const textTone = tx.stage === "error" ? "text-error" : "text-primary";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className={`font-headline text-sm font-bold uppercase tracking-widest ${textTone}`}
          >
            {label} status
          </p>
          <p className="mt-1 text-sm text-slate-200">
            {tx.stage === "requesting" &&
              `Preparing ${label.toLowerCase()} voucher...`}
            {tx.stage === "awaiting_wallet" &&
              `Confirm the ${label.toLowerCase()} transaction in your wallet.`}
            {tx.stage === "pending" &&
              `${label} transaction submitted to WireFluid.`}
            {tx.stage === "success" && `${label} confirmed on-chain.`}
            {tx.stage === "error" && (tx.error ?? `${label} failed.`)}
          </p>
        </div>

        {tx.hash ? (
          <a
            className="text-sm font-bold text-primary underline-offset-4 hover:underline"
            href={explorerTxUrl(tx.hash)}
            rel="noreferrer"
            target="_blank"
          >
            View transaction
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { isAuthenticated, status, token } = useAuth();
  const { writeContractAsync } = useWriteContract();

  const [dashboard, setDashboard] = useState<DashboardSummaryDTO | null>(null);
  const [chainState, setChainState] = useState<DashboardChainStateDTO | null>(
    null,
  );
  const [globalState, setGlobalState] = useState<DashboardGlobalDTO | null>(
    null,
  );
  const [chainStateError, setChainStateError] = useState<string | null>(null);
  const [globalStateError, setGlobalStateError] = useState<string | null>(null);
  const [isChainStateLoading, setIsChainStateLoading] = useState(false);
  const [isGlobalStateLoading, setIsGlobalStateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tx, setTx] = useState<TransactionState>({
    action: null,
    error: null,
    hash: null,
    nonce: null,
    stage: "idle",
  });

  const txHash = tx.hash ?? undefined;
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const cancelPendingSync = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ cancelled: boolean }>("/api/sync/cancel", {
        method: "POST",
        token,
      });
    } catch {
      // Best effort cleanup for vouchers that never reached chain.
    }
  }, [token]);

  const confirmPendingSync = useCallback(
    async (hash: `0x${string}`, nonce: string, blockNumber?: bigint) => {
      if (!token || blockNumber == null) {
        return;
      }

      try {
        await apiFetch<{ confirmed: boolean }>("/api/sync/confirm", {
          json: {
            blockNumber: blockNumber.toString(),
            nonce,
            txHash: hash,
          },
          method: "POST",
          token,
        });
      } catch {
        // Best effort: dashboard still derives balances from chain reads.
      }
    },
    [token],
  );

  const loadChainState = useCallback(async () => {
    if (!token) {
      setChainState(null);
      setChainStateError(null);
      setIsChainStateLoading(false);
      return;
    }

    setIsChainStateLoading(true);
    setChainStateError(null);

    try {
      const nextChainState = await apiFetch<DashboardChainStateDTO>(
        "/api/dashboard/chain-state",
        { token },
      );
      setChainState(nextChainState);
    } catch (err) {
      setChainState(null);
      setChainStateError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to load live balance",
      );
    } finally {
      setIsChainStateLoading(false);
    }
  }, [token]);

  const loadGlobalState = useCallback(async () => {
    if (!token) {
      setGlobalState(null);
      setGlobalStateError(null);
      setIsGlobalStateLoading(false);
      return;
    }

    setIsGlobalStateLoading(true);
    setGlobalStateError(null);

    try {
      const nextGlobalState = await apiFetch<DashboardGlobalDTO>(
        "/api/dashboard/global-standing",
        { token },
      );
      setGlobalState(nextGlobalState);
    } catch (err) {
      setGlobalState(null);
      setGlobalStateError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to load global standing",
      );
    } finally {
      setIsGlobalStateLoading(false);
    }
  }, [token]);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      setChainState(null);
      setGlobalState(null);
      setChainStateError(null);
      setGlobalStateError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextDashboard = await apiFetch<DashboardSummaryDTO>(
        "/api/dashboard/me",
        {
          token,
        },
      );
      setDashboard(nextDashboard);
      void loadChainState();
      void loadGlobalState();
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to load dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadChainState, loadGlobalState, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setDashboard(null);
      setChainState(null);
      setGlobalState(null);
      setChainStateError(null);
      setGlobalStateError(null);
      setIsChainStateLoading(false);
      setIsGlobalStateLoading(false);
      setError(null);
      return;
    }

    void loadDashboard();
  }, [isAuthenticated, loadDashboard, token]);

  useEffect(() => {
    if (!tx.hash) {
      return;
    }

    if (receipt.isLoading) {
      setTx((current) => ({ ...current, stage: "pending" }));
      return;
    }

    if (receipt.isSuccess) {
      if (tx.action === "sync" && tx.hash && tx.nonce) {
        void confirmPendingSync(tx.hash, tx.nonce, receipt.data.blockNumber);
      }

      setTx((current) => ({ ...current, stage: "success" }));
      void loadDashboard();
      return;
    }

    if (receipt.isError) {
      if (tx.action === "sync") {
        void cancelPendingSync().finally(() => {
          void loadDashboard();
        });
      }

      setTx((current) => ({
        ...current,
        error: receipt.error?.message ?? "Transaction failed",
        stage: "error",
      }));
    }
  }, [
    loadDashboard,
    receipt.error,
    receipt.isError,
    receipt.isLoading,
    receipt.isSuccess,
    confirmPendingSync,
    cancelPendingSync,
    tx.action,
    tx.hash,
    tx.nonce,
  ]);

  const hasUnsyncedPoints = (chainState?.balances.unsynced ?? 0) > 0;
  const hasClaimableTier = Boolean(
    chainState?.prize.canClaim && chainState.prize.currentTier,
  );
  const isBusy =
    tx.stage === "requesting" ||
    tx.stage === "awaiting_wallet" ||
    tx.stage === "pending";
  const isChainStateUnavailable =
    !isChainStateLoading && chainState == null && chainStateError != null;
  const isGlobalStateUnavailable =
    !isGlobalStateLoading && globalState == null && globalStateError != null;

  const handleSync = useCallback(async () => {
    if (!token || !hasUnsyncedPoints || isChainStateLoading) {
      return;
    }

    setTx({
      action: "sync",
      error: null,
      hash: null,
      nonce: null,
      stage: "requesting",
    });

    let voucherNonce: string | null = null;

    try {
      const response = await apiFetch<SyncVoucherResponse>("/api/sync", {
        method: "POST",
        token,
      });

      voucherNonce = response.voucher.nonce;

      setTx({
        action: "sync",
        error: null,
        hash: null,
        nonce: response.voucher.nonce,
        stage: "awaiting_wallet",
      });

      const hash = await writeContractAsync({
        abi: PSLPointsAbi,
        address: CONTRACT_ADDRESSES.PSLPoints,
        functionName: "sync",
        args: [
          BigInt(response.voucher.amount),
          BigInt(response.voucher.nonce),
          response.signature,
        ],
      });

      setTx({
        action: "sync",
        error: null,
        hash,
        nonce: response.voucher.nonce,
        stage: "pending",
      });
    } catch (err) {
      if (voucherNonce) {
        await cancelPendingSync();
        void loadDashboard();
      }

      setTx({
        action: "sync",
        error:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Sync failed",
        hash: null,
        nonce: voucherNonce,
        stage: "error",
      });
    }
  }, [
    cancelPendingSync,
    hasUnsyncedPoints,
    isChainStateLoading,
    loadDashboard,
    token,
    writeContractAsync,
  ]);

  const handleClaim = useCallback(async () => {
    if (
      !token ||
      !chainState?.prize.currentTier ||
      !chainState.prize.canClaim ||
      isChainStateLoading
    ) {
      return;
    }

    setTx({
      action: "claim",
      error: null,
      hash: null,
      nonce: null,
      stage: "requesting",
    });

    try {
      const response = await apiFetch<ClaimVoucherResponse>("/api/claim", {
        json: { tierId: chainState.prize.currentTier.id },
        method: "POST",
        token,
      });

      setTx({
        action: "claim",
        error: null,
        hash: null,
        nonce: response.voucher.nonce,
        stage: "awaiting_wallet",
      });

      const hash = await writeContractAsync({
        abi: PSLPointsAbi,
        address: CONTRACT_ADDRESSES.PSLPoints,
        functionName: "claimTier",
        args: [
          response.voucher.tierId,
          BigInt(response.voucher.nonce),
          response.signature,
        ],
      });

      setTx({
        action: "claim",
        error: null,
        hash,
        nonce: response.voucher.nonce,
        stage: "pending",
      });
    } catch (err) {
      setTx({
        action: "claim",
        error:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Claim failed",
        hash: null,
        nonce: null,
        stage: "error",
      });
    }
  }, [
    chainState?.prize.canClaim,
    chainState?.prize.currentTier,
    isChainStateLoading,
    token,
    writeContractAsync,
  ]);

  const claimButtonLabel = useMemo(() => {
    if (dashboard?.claim?.status === "confirmed") {
      return `Claimed ${dashboard.claim.tierDisplayName}`;
    }

    if (dashboard?.claim?.status === "pending") {
      return `Pending ${dashboard.claim.tierDisplayName}`;
    }

    if (isChainStateLoading) {
      return "Checking eligibility...";
    }

    if (chainStateError) {
      return "Eligibility unavailable";
    }

    if (chainState?.prize.canClaim && chainState.prize.currentTier) {
      return `Claim ${chainState.prize.currentTier.displayName}`;
    }

    return "Claim Prize";
  }, [
    chainState?.prize.canClaim,
    chainState?.prize.currentTier,
    chainStateError,
    dashboard?.claim,
    isChainStateLoading,
  ]);

  const statusLabel = dashboard
    ? dashboardStatusLabel(dashboard, chainState)
    : "Active";
  const statusHighlighted =
    Boolean(dashboard?.claim) || chainState?.prize.qualified;

  if (
    !isAuthenticated ||
    status === "disconnected" ||
    status === "connected" ||
    status === "wrong-network"
  ) {
    return <EmptyDashboard />;
  }

  if (isLoading && !dashboard) {
    return <LoadingState />;
  }

  if (error && !dashboard) {
    return <ErrorState error={error} onRetry={() => void loadDashboard()} />;
  }

  if (!dashboard) {
    return <LoadingState />;
  }

  const matchActivity = [
    ...dashboard.recentMatches,
    ...dashboard.upcomingMatches,
  ].sort(compareMatchActivity);
  const matchActivityLabel =
    matchActivity.length > 0 ? `${matchActivity.length} matches` : "No matches";

  return (
    <AppChrome
      dashboard={dashboard}
      isWalletBalanceLoading={isChainStateLoading}
      walletBalance={chainState?.balances.walletBalance ?? null}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[2rem] bg-surface-container-low p-8 md:col-span-2">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Total Performance Points
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                OFF-CHAIN
              </span>
            </div>
            <h1 className="-ml-1 font-headline text-6xl font-bold tracking-tight text-on-surface md:text-8xl">
              {formatInteger(dashboard.balances.totalEarned)}
            </h1>
          </div>

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col">
              <span className="mb-1 text-xs text-slate-400">
                Unsynced Delta
              </span>
              <div className="flex items-center gap-2">
                {chainState ? (
                  <span className="font-headline text-2xl font-bold text-secondary">
                    +{formatInteger(chainState.balances.unsynced)}
                  </span>
                ) : isChainStateUnavailable ? (
                  <span className="font-headline text-2xl font-bold text-slate-400">
                    Unavailable
                  </span>
                ) : (
                  <BalanceSkeleton className="h-8 w-28" />
                )}
                <Icon
                  className="animate-pulse text-secondary"
                  name="cloud_sync"
                />
              </div>
            </div>

            <button
              className="flex items-center gap-3 rounded-full px-8 py-4 font-headline font-bold text-on-primary transition-all pitch-gradient hover:shadow-[0_0_30px_rgba(84,233,138,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                !hasUnsyncedPoints ||
                isBusy ||
                isChainStateLoading ||
                isChainStateUnavailable
              }
              onClick={() => {
                void handleSync();
              }}
              type="button"
            >
              {isChainStateLoading
                ? "Checking Chain"
                : isChainStateUnavailable
                  ? "Balance Unavailable"
                  : hasUnsyncedPoints
                    ? "Sync to Chain"
                    : "Nothing to Sync"}
              <Icon name="bolt" />
            </button>
          </div>

          <div className="absolute bottom-[-20%] right-[-10%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />
        </section>

        <section className="flex flex-col justify-between rounded-[2rem] border border-outline-variant/10 bg-surface-container-high p-8">
          <div>
            <div className="mb-6 flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Status
              </span>
              <Icon
                className={
                  statusHighlighted ? "text-primary" : "text-secondary"
                }
                name={statusHighlighted ? "verified" : "hourglass_top"}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Global Rank</span>
                {globalState ? (
                  <span className="font-headline text-xl font-bold">
                    {formatRank(globalState.global.rank)}
                  </span>
                ) : isGlobalStateUnavailable ? (
                  <span className="font-headline text-xl font-bold text-slate-400">
                    Unavailable
                  </span>
                ) : (
                  <BalanceSkeleton className="h-6 w-20" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Current Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${statusHighlighted ? "bg-secondary/20 text-secondary" : "bg-surface-variant text-slate-400"}`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex justify-between text-xs">
              {chainState ? (
                <>
                  <span className="text-slate-400">
                    {chainState.prize.progressLabel}
                  </span>
                  <span className="font-bold text-primary">
                    {chainState.prize.progressPercent}%
                  </span>
                </>
              ) : isChainStateUnavailable ? (
                <span className="text-slate-400">
                  Live prize progress unavailable
                </span>
              ) : (
                <>
                  <BalanceSkeleton className="h-4 w-40" />
                  <BalanceSkeleton className="h-4 w-12" />
                </>
              )}
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-highest">
              {chainState ? (
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${chainState.prize.progressPercent}%` }}
                />
              ) : (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/35" />
              )}
            </div>

            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 font-headline font-bold transition-colors disabled:cursor-not-allowed disabled:bg-surface-variant disabled:text-slate-500 enabled:bg-primary enabled:text-on-primary"
              disabled={
                !hasClaimableTier ||
                Boolean(dashboard.claim) ||
                isBusy ||
                isChainStateLoading ||
                isChainStateUnavailable
              }
              onClick={() => {
                void handleClaim();
              }}
              type="button"
            >
              {!hasClaimableTier || dashboard.claim ? (
                <Icon className="text-sm" name="lock" />
              ) : null}
              {claimButtonLabel}
            </button>
          </div>
        </section>
      </div>

      <div className="mt-6">
        <TransactionNotice tx={tx} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h3 className="px-2 font-headline text-xl font-bold tracking-tight">
              Leaderboard Standing
            </h3>
          </div>

          <section className="rounded-[2rem] border border-outline-variant/15 bg-surface-container p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-bright">
                <Icon className="text-primary" name="emoji_events" />
              </div>
              <div>
                <p className="text-sm font-bold">Status</p>
                <p className="text-xs text-slate-400">
                  Live summary for your current dashboard state.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div
                className={`flex items-center justify-between rounded-2xl p-4 ${statusHighlighted ? "border border-primary/20 bg-surface-container-low" : "bg-surface-container-low"}`}
              >
                <span className="text-slate-300">Current Status</span>
                <span
                  className={`font-bold ${statusHighlighted ? "text-primary" : "text-secondary"}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                <span className="text-slate-300">Leaderboard Rank</span>
                {globalState ? (
                  <span className="font-bold">
                    {formatRank(globalState.global.rank)}
                  </span>
                ) : isGlobalStateUnavailable ? (
                  <span className="font-bold text-slate-400">Unavailable</span>
                ) : (
                  <BalanceSkeleton className="h-5 w-16" />
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                <span className="text-slate-300">Leaderboard %</span>
                {globalState ? (
                  <span className="font-bold text-secondary">
                    {globalState.global.percentile != null
                      ? `${globalState.global.percentile}%`
                      : "-"}
                  </span>
                ) : isGlobalStateUnavailable ? (
                  <span className="font-bold text-slate-400">Unavailable</span>
                ) : (
                  <BalanceSkeleton className="h-5 w-12" />
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                <span className="text-slate-300">Total Points</span>
                <span className="font-bold">
                  {formatInteger(dashboard.balances.totalEarned)}
                </span>
              </div>
            </div>
          </section>

          <section className="group relative overflow-hidden rounded-[2rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(84,233,138,0.18),transparent_55%)]" />
            <div className="relative flex h-48 flex-col justify-end rounded-[2rem] border border-outline-variant/20 bg-gradient-to-br from-surface-container/90 to-surface-container-high/90 p-8">
              <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">
                Wallet Balance
              </p>
              {chainState ? (
                <>
                  <h4 className="font-headline text-4xl font-bold text-on-surface">
                    {formatWeiInteger(chainState.balances.walletBalance)} BNDY
                  </h4>
                  <p className="mt-2 text-sm text-slate-400">
                    On-chain earned:{" "}
                    {formatWeiInteger(chainState.balances.onChainEarned)} BNDY
                  </p>
                </>
              ) : isChainStateUnavailable ? (
                <>
                  <h4 className="font-headline text-3xl font-bold text-on-surface">
                    Live balance unavailable
                  </h4>
                  <button
                    className="mt-3 self-start text-sm font-bold text-primary underline-offset-4 hover:underline"
                    onClick={() => {
                      void loadChainState();
                    }}
                    type="button"
                  >
                    Retry live balance
                  </button>
                </>
              ) : (
                <>
                  <BalanceSkeleton className="h-10 w-48" />
                  <BalanceSkeleton className="mt-3 h-4 w-36" />
                </>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="px-2">
            <h3 className="font-headline text-xl font-bold tracking-tight">
              Match Activity
            </h3>
          </div>

          <MatchActivitySection
            action={
              <Link
                className="text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-primary"
                href="/dashboard/fixtures"
              >
                View all
              </Link>
            }
            emptyDescription="Live, upcoming, and scored fixtures will appear here as soon as the active tournament schedule is populated."
            emptyTitle="No match activity yet"
            label={matchActivityLabel}
            matches={matchActivity}
            title="Match Activity"
          />
        </div>
      </div>
    </AppChrome>
  );
}
