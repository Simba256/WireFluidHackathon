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

function formatRankWithTotal(rank: number | null, total: number): string {
  if (rank == null) {
    return "-";
  }

  return `${formatRank(rank)} of ${formatInteger(total)}`;
}

function formatDateLabel(playedAt: string | null, scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(playedAt ?? scheduledAt));
}

function formatDateTimeLabel(
  playedAt: string | null,
  scheduledAt: string,
): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(playedAt ?? scheduledAt));
}

function formatDateStack(
  playedAt: string | null,
  scheduledAt: string,
): {
  top: string;
  bottom: string;
} {
  const date = new Date(playedAt ?? scheduledAt);

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
  }).format(date);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
  const year = new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
  }).format(date);

  return {
    top: `${weekday}, ${day}`,
    bottom: `${month} '${year}`,
  };
}

function formatKickoffTime(scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(scheduledAt));
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

function TeamLogoPuck({
  side,
}: {
  side: DashboardSummaryDTO["recentMatches"][number]["teamA"];
}) {
  return (
    <div
      className="relative flex h-28 w-28 items-center justify-center overflow-hidden md:h-32 md:w-32 lg:h-36 lg:w-36"
      style={{
        filter: `drop-shadow(0 14px 24px ${side.accentColor}30)`,
      }}
    >
      {side.logoPath ? (
        <Image
          src={side.logoPath}
          alt={side.name}
          fill
          className="object-contain"
          sizes="144px"
        />
      ) : (
        <span
          className="font-headline text-xl font-bold"
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

function MatchActivitySkeletonCard() {
  return (
    <div className="rounded-[2.5rem] bg-surface-container-low p-8 md:p-10 lg:px-12 lg:py-10">
      <div className="space-y-7">
        <div className="flex items-start justify-between gap-6">
          <div className="shrink-0 text-left">
            <div className="h-9 w-28 animate-pulse rounded-md bg-surface-container-high md:h-10 md:w-32" />
            <div className="mt-2 h-9 w-24 animate-pulse rounded-md bg-surface-container-highest/80 md:h-10 md:w-28" />
          </div>

          <div className="flex flex-col items-end gap-2">
            <BalanceSkeleton className="h-4 w-20" />
            <BalanceSkeleton className="h-4 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(7rem,1fr)_auto_minmax(7rem,1fr)] items-start gap-6 md:gap-10">
          <div className="flex min-w-[7rem] flex-col items-center gap-4 text-center">
            <div className="h-28 w-28 animate-pulse rounded-full bg-surface-container-high md:h-32 md:w-32 lg:h-36 lg:w-36" />
            <BalanceSkeleton className="h-6 w-16" />
            <BalanceSkeleton className="h-5 w-28" />
          </div>

          <div className="flex items-center justify-center pt-12 md:pt-14 lg:pt-16">
            <BalanceSkeleton className="h-8 w-12" />
          </div>

          <div className="flex min-w-[7rem] flex-col items-center gap-4 text-center">
            <div className="h-28 w-28 animate-pulse rounded-full bg-surface-container-high md:h-32 md:w-32 lg:h-36 lg:w-36" />
            <BalanceSkeleton className="h-6 w-16" />
            <BalanceSkeleton className="h-5 w-28" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <BalanceSkeleton className="h-10 w-28 bg-primary/10" />
          <BalanceSkeleton className="h-10 w-28 bg-primary/10" />
        </div>
      </div>
    </div>
  );
}

function MatchActivitySection({
  action,
  emptyDescription,
  emptyTitle,
  isLoading = false,
  label,
  matches,
  title,
}: {
  action?: React.ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  isLoading?: boolean;
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
          {isLoading ? (
            <BalanceSkeleton className="h-5 w-24" />
          ) : (
            <span className="text-sm font-bold text-primary">{label}</span>
          )}
          {action}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <MatchActivitySkeletonCard />
          <MatchActivitySkeletonCard />
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-[2rem] border border-outline-variant/15 bg-surface-container-low p-8">
          <p className="font-headline text-2xl font-bold text-on-surface">
            {emptyTitle}
          </p>
          <p className="mt-3 max-w-xl text-slate-300">{emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((matchItem) => (
            <Link
              key={`${matchItem.status}-${matchItem.id}`}
              href={`/play?matchId=${matchItem.id}`}
              className="block rounded-[2.5rem] border border-outline-variant/15 bg-surface-container-low p-8 transition-colors hover:bg-surface-container-highest md:p-10 lg:px-12 lg:py-10"
            >
              <div className="space-y-7">
                <div className="flex items-start justify-between gap-6">
                  <div className="shrink-0 text-left">
                    <p className="font-headline text-2xl font-bold leading-none text-on-surface md:text-[2rem]">
                      {
                        formatDateStack(
                          matchItem.playedAt,
                          matchItem.scheduledAt,
                        ).top
                      }
                    </p>
                    <p className="mt-2 font-headline text-2xl font-bold leading-none text-slate-400 md:text-[2rem]">
                      {
                        formatDateStack(
                          matchItem.playedAt,
                          matchItem.scheduledAt,
                        ).bottom
                      }
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-on-surface">
                      Match {matchItem.fixtureNumber}
                    </p>
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                      {matchItem.venue ?? "Venue TBD"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(7rem,1fr)_auto_minmax(7rem,1fr)] items-start gap-6 md:gap-10">
                  <div className="flex min-w-[7rem] flex-col items-center gap-4 text-center">
                    <TeamLogoPuck side={matchItem.teamA} />
                    <span className="scoreboard-wordmark text-[1.2rem] md:text-[1.35rem] lg:text-[1.55rem]">
                      {matchItem.teamA.shortCode}
                    </span>
                    <p className="max-w-[11rem] text-center font-headline text-base font-bold text-slate-300 md:text-lg">
                      {matchItem.teamA.name}
                    </p>
                  </div>

                  <div className="pt-12 text-center md:pt-14 lg:pt-16">
                    <span className="scoreboard-wordmark text-[1.45rem] md:text-[1.7rem] lg:text-[1.95rem]">
                      <span className="scoreboard-vs">vs</span>
                    </span>
                  </div>

                  <div className="flex min-w-[7rem] flex-col items-center gap-4 text-center">
                    <TeamLogoPuck side={matchItem.teamB} />
                    <span className="scoreboard-wordmark text-[1.2rem] md:text-[1.35rem] lg:text-[1.55rem]">
                      {matchItem.teamB.shortCode}
                    </span>
                    <p className="max-w-[11rem] text-center font-headline text-base font-bold text-slate-300 md:text-lg">
                      {matchItem.teamB.name}
                    </p>
                  </div>
                </div>

                {matchItem.status === "completed" ? (
                  matchItem.teamAScore != null ||
                  matchItem.teamBScore != null ? (
                    <div className="flex flex-wrap items-center justify-center gap-4 text-lg text-slate-100 md:text-xl">
                      <span className="rounded-full border border-outline-variant/15 bg-surface-container px-5 py-2.5 font-black tracking-wide shadow-sm">
                        {matchItem.teamAScore ?? "-"}
                      </span>
                      <span className="rounded-full border border-outline-variant/15 bg-surface-container px-5 py-2.5 font-black tracking-wide shadow-sm">
                        {matchItem.teamBScore ?? "-"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-400">
                      Official scoreline unavailable
                    </p>
                  )
                ) : (
                  <p className="text-center text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
                    {matchItem.status === "live"
                      ? "Live now"
                      : `Starts ${formatKickoffTime(matchItem.scheduledAt)}`}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function AppChrome({
  children,
  isWalletBalanceLoading = false,
  walletBalance = null,
}: {
  children: React.ReactNode;
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

      <div className="min-h-screen pt-16">
        <main className="mx-auto w-full max-w-[96rem] px-6 pb-24 pt-6 md:px-10 md:pb-10 xl:px-12">
          {children}
        </main>
      </div>

      <footer className="border-t border-outline-variant/5 bg-background px-8 py-12">
        <div className="mx-auto flex max-w-[96rem] flex-col items-center justify-between gap-8 md:flex-row">
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
    void loadChainState();
    void loadGlobalState();

    try {
      const nextDashboard = await apiFetch<DashboardSummaryDTO>(
        "/api/dashboard/me",
        {
          token,
        },
      );
      setDashboard(nextDashboard);
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
  const isDashboardLoading = dashboard == null && error == null;
  const isChainStatePending = chainState == null && chainStateError == null;

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

  if (
    !isAuthenticated ||
    status === "disconnected" ||
    status === "connected" ||
    status === "wrong-network"
  ) {
    return <EmptyDashboard />;
  }
  const liveMatches = dashboard?.upcomingMatches.filter(
    (matchItem) => matchItem.status === "live",
  );
  const nextUpcomingMatches = dashboard?.upcomingMatches.filter(
    (matchItem) => matchItem.status === "scheduled",
  );
  const recentMatches = dashboard?.recentMatches.slice(0, 2) ?? [];
  const matchActivity = dashboard
    ? [
        ...(liveMatches ?? []),
        ...(nextUpcomingMatches ?? []).slice(0, 2),
        ...recentMatches,
      ]
    : [];
  const matchActivityLabel =
    matchActivity.length > 0 ? `${matchActivity.length} matches` : "No matches";
  const prizeStatusLabel = dashboard
    ? dashboardStatusLabel(dashboard, chainState)
    : null;
  const statusHighlighted =
    Boolean(dashboard?.claim) || chainState?.prize.qualified;

  return (
    <AppChrome
      isWalletBalanceLoading={isChainStatePending}
      walletBalance={chainState?.balances.walletBalance ?? null}
    >
      {error && !dashboard ? (
        <ErrorState error={error} onRetry={() => void loadDashboard()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <section className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[2rem] bg-surface-container-low p-8 md:col-span-2">
              <div className="relative z-10">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Total Performance Points
                  </span>
                </div>
                <h1 className="-ml-1 font-headline text-6xl font-bold tracking-tight text-on-surface md:text-8xl">
                  {dashboard ? (
                    formatInteger(dashboard.balances.totalEarned)
                  ) : (
                    <BalanceSkeleton className="h-16 w-44 bg-primary/20 md:h-24 md:w-72" />
                  )}
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
                    isDashboardLoading ||
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
                  {isDashboardLoading
                    ? "Loading..."
                    : isChainStateLoading
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
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Prize Standing
                    </span>
                  </div>
                  <Icon
                    className={
                      statusHighlighted ? "text-primary" : "text-secondary"
                    }
                    name={statusHighlighted ? "verified" : "hourglass_top"}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Prize Rank</span>
                    {chainState ? (
                      <span className="font-headline text-xl font-bold">
                        {chainState.prize.qualified
                          ? formatRankWithTotal(
                              chainState.prize.prizeRank,
                              chainState.prize.prizeTotal,
                            )
                          : chainState.prize.prizeTotal > 0
                            ? "Not qualified"
                            : "No qualifiers yet"}
                      </span>
                    ) : isChainStateUnavailable ? (
                      <span className="font-headline text-xl font-bold text-slate-400">
                        Unavailable
                      </span>
                    ) : (
                      <BalanceSkeleton className="h-6 w-20" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Status</span>
                    {prizeStatusLabel ? (
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${statusHighlighted ? "bg-secondary/20 text-secondary" : "bg-surface-variant text-slate-400"}`}
                      >
                        {prizeStatusLabel}
                      </span>
                    ) : (
                      <BalanceSkeleton className="h-8 w-24 bg-secondary/15" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Eligible Tier</span>
                    {dashboard?.claim ? (
                      <span className="font-bold text-primary">
                        {dashboard.claim.tierDisplayName}
                      </span>
                    ) : chainState?.prize.currentTier ? (
                      <span className="font-bold text-primary">
                        {chainState.prize.currentTier.displayName}
                      </span>
                    ) : isChainStateUnavailable ? (
                      <span className="font-bold text-slate-400">
                        Unavailable
                      </span>
                    ) : isChainStateLoading ? (
                      <BalanceSkeleton className="h-5 w-24" />
                    ) : (
                      <span className="font-bold text-slate-400">
                        Not unlocked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
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
                    isDashboardLoading ||
                    !hasClaimableTier ||
                    Boolean(dashboard?.claim) ||
                    isBusy ||
                    isChainStateLoading ||
                    isChainStateUnavailable
                  }
                  onClick={() => {
                    void handleClaim();
                  }}
                  type="button"
                >
                  {!hasClaimableTier || dashboard?.claim ? (
                    <Icon className="text-sm" name="lock" />
                  ) : null}
                  {isDashboardLoading ? "Loading..." : claimButtonLabel}
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
                  Global Leaderboard
                </h3>
              </div>

              <section className="rounded-[2rem] border border-outline-variant/15 bg-surface-container p-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-bright">
                    <Icon className="text-primary" name="emoji_events" />
                  </div>
                  <div>
                    <p className="font-headline text-lg font-bold">
                      Global Position
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                    <span className="text-slate-300">Rank</span>
                    {globalState ? (
                      <span className="font-bold">
                        {formatRankWithTotal(
                          globalState.global.rank,
                          globalState.global.totalPlayers,
                        )}
                      </span>
                    ) : isGlobalStateUnavailable ? (
                      <span className="font-bold text-slate-400">
                        Unavailable
                      </span>
                    ) : (
                      <BalanceSkeleton className="h-5 w-16" />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                    <span className="text-slate-300">Top Percentile</span>
                    {globalState ? (
                      <span className="font-bold text-secondary">
                        {globalState.global.percentile != null
                          ? `${globalState.global.percentile}%`
                          : "-"}
                      </span>
                    ) : isGlobalStateUnavailable ? (
                      <span className="font-bold text-slate-400">
                        Unavailable
                      </span>
                    ) : (
                      <BalanceSkeleton className="h-5 w-12" />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                    <span className="text-slate-300">Total Points</span>
                    {dashboard ? (
                      <span className="font-bold">
                        {formatInteger(dashboard.balances.totalEarned)}
                      </span>
                    ) : (
                      <BalanceSkeleton className="h-5 w-16" />
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-center rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-3">
                  <Link
                    className="shrink-0 text-sm font-bold text-primary transition-colors hover:text-secondary"
                    href="/leaderboard"
                  >
                    View Leaderboard
                  </Link>
                </div>
              </section>

              <section className="group relative overflow-hidden rounded-[2rem]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(84,233,138,0.18),transparent_55%)]" />
                <div className="relative flex h-48 flex-col justify-center rounded-[2rem] border border-outline-variant/20 bg-gradient-to-br from-surface-container/90 to-surface-container-high/90 p-8">
                  <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">
                    Wallet Balance
                  </p>
                  {chainState ? (
                    <>
                      <h4 className="font-headline text-4xl font-bold text-on-surface">
                        {formatWeiInteger(chainState.balances.walletBalance)}{" "}
                        BNDY
                      </h4>
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
                isLoading={isDashboardLoading}
                label={matchActivityLabel}
                matches={matchActivity}
                title="Match Activity"
              />
            </div>
          </div>
        </>
      )}
    </AppChrome>
  );
}
