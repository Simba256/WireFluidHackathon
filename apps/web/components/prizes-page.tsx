"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  BNDY_DECIMALS,
  CONTRACT_ADDRESSES,
  MIN_EARNED_TO_CLAIM_BNDY,
  PSLPointsAbi,
  explorerTxUrl,
  type DashboardChainStateDTO,
  type DashboardSummaryDTO,
  type DashboardSummaryWithChainDTO,
} from "@boundaryline/shared";
import { useAuth } from "@/components/auth-provider";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { apiFetch, ApiClientError } from "@/lib/api-client";

interface PrizeTierDTO {
  tierId: number;
  name: string | null;
  displayName: string;
  rankRequired: number;
  stock: number;
  claimed: number;
  remaining: number;
  prize: {
    name: string;
    description: string;
    imageUrl: string | null;
  };
}

interface PrizesResponse {
  tiers: PrizeTierDTO[];
}

interface ClaimVoucherResponse {
  voucher: { user: string; tierId: number; nonce: string };
  signature: `0x${string}`;
}

type ClaimStage =
  | "idle"
  | "requesting"
  | "awaiting_wallet"
  | "pending"
  | "success"
  | "error";

interface ClaimState {
  tierId: number | null;
  stage: ClaimStage;
  hash: `0x${string}` | null;
  error: string | null;
}

const TIER_BADGE_LABEL: Record<number, string> = {
  1: "Tier 1 • Grand Prize",
  2: "Tier 2 • Pro Elite",
  3: "Tier 3 • Performance",
  4: "Tier 4 • Fan Kit",
  5: "Tier 5 • Bronze",
};

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

function bndyBalanceLabel(weiString: string): string {
  try {
    const formatted = formatUnits(BigInt(weiString), BNDY_DECIMALS);
    const [whole] = formatted.split(".");
    return formatInteger(Number(whole));
  } catch {
    return "0";
  }
}

export function PrizesPage() {
  const { isAuthenticated, token } = useAuth();
  const { writeContractAsync } = useWriteContract();

  const [prizes, setPrizes] = useState<PrizeTierDTO[] | null>(null);
  const [dashboard, setDashboard] =
    useState<DashboardSummaryWithChainDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claim, setClaim] = useState<ClaimState>({
    tierId: null,
    stage: "idle",
    hash: null,
    error: null,
  });

  const txHash = claim.hash ?? undefined;
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const loadPrizes = useCallback(async () => {
    try {
      const response = await apiFetch<PrizesResponse>("/api/prizes");
      setPrizes(response.tiers.sort((a, b) => a.tierId - b.tierId));
    } catch (err) {
      setLoadError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to load prizes",
      );
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      return;
    }
    try {
      const [summary, chainState] = await Promise.all([
        apiFetch<DashboardSummaryDTO>("/api/dashboard/me", { token }),
        apiFetch<DashboardChainStateDTO>("/api/dashboard/chain-state", {
          token,
        }),
      ]);

      setDashboard({
        ...summary,
        ...chainState,
        balances: {
          ...summary.balances,
          ...chainState.balances,
        },
      } satisfies DashboardSummaryWithChainDTO);
    } catch {
      setDashboard(null);
    }
  }, [token]);

  useEffect(() => {
    void loadPrizes();
  }, [loadPrizes]);

  useEffect(() => {
    if (isAuthenticated && token) {
      void loadDashboard();
    } else {
      setDashboard(null);
    }
  }, [isAuthenticated, token, loadDashboard]);

  useEffect(() => {
    if (!claim.hash) return;
    if (receipt.isLoading) {
      setClaim((c) => ({ ...c, stage: "pending" }));
      return;
    }
    if (receipt.isSuccess) {
      setClaim((c) => ({ ...c, stage: "success" }));
      void loadPrizes();
      void loadDashboard();
      return;
    }
    if (receipt.isError) {
      setClaim((c) => ({
        ...c,
        stage: "error",
        error: receipt.error?.message ?? "Transaction failed",
      }));
    }
  }, [
    claim.hash,
    receipt.isLoading,
    receipt.isSuccess,
    receipt.isError,
    receipt.error,
    loadPrizes,
    loadDashboard,
  ]);

  const activeClaim = dashboard?.claim ?? null;
  const userTierId = dashboard?.prize.currentTier?.id ?? null;
  const canClaim = dashboard?.prize.canClaim ?? false;
  const isBusy =
    claim.stage === "requesting" ||
    claim.stage === "awaiting_wallet" ||
    claim.stage === "pending";

  const handleClaim = useCallback(
    async (tierId: number) => {
      if (!token) return;
      setClaim({ tierId, stage: "requesting", hash: null, error: null });
      try {
        const response = await apiFetch<ClaimVoucherResponse>("/api/claim", {
          json: { tierId },
          method: "POST",
          token,
        });
        setClaim((c) => ({ ...c, stage: "awaiting_wallet" }));
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
        setClaim({ tierId, stage: "pending", hash, error: null });
      } catch (err) {
        setClaim({
          tierId,
          stage: "error",
          hash: null,
          error:
            err instanceof ApiClientError || err instanceof Error
              ? err.message
              : "Claim failed",
        });
      }
    },
    [token, writeContractAsync],
  );

  const walletBalanceLabel = useMemo(
    () =>
      dashboard ? bndyBalanceLabel(dashboard.balances.walletBalance) : null,
    [dashboard],
  );

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 lg:pt-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <header className="relative mb-10">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mb-4 font-headline text-5xl font-bold tracking-tighter text-on-surface md:text-7xl">
                Seasonal <span className="italic text-primary">Prizes</span>
              </h1>
              <div className="max-w-2xl rounded-2xl border-l-4 border-secondary bg-surface-container-low p-6 shadow-xl">
                <p className="text-lg leading-relaxed text-on-surface-variant">
                  Qualify by earning{" "}
                  <span className="font-bold text-primary">
                    {formatInteger(MIN_EARNED_TO_CLAIM_BNDY)} BNDY
                  </span>{" "}
                  in-game. Claiming a tier{" "}
                  <span className="font-bold text-secondary">
                    burns your entire wallet balance
                  </span>{" "}
                  and mints a unique{" "}
                  <span className="font-bold text-on-surface">
                    Soulbound Trophy NFT
                  </span>{" "}
                  to your profile forever.
                </p>
              </div>
            </div>
            <UserStandingCard
              dashboard={dashboard}
              walletBalanceLabel={walletBalanceLabel}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </header>

        {loadError ? (
          <div className="mb-8 rounded-2xl border border-error/40 bg-error/10 p-4 text-sm text-error">
            {loadError}
          </div>
        ) : null}

        {claim.stage !== "idle" ? <ClaimStatusBanner claim={claim} /> : null}

        {!prizes ? (
          <PrizeGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
            {prizes.map((tier, idx) => (
              <div
                key={tier.tierId}
                className={`xl:col-span-2 ${idx === 0 ? "xl:col-start-2" : ""}`}
              >
                <PrizeCard
                  tier={tier}
                  userTierId={userTierId}
                  userCanClaim={canClaim}
                  activeClaimTierId={activeClaim?.tierId ?? null}
                  activeClaimStatus={activeClaim?.status ?? null}
                  isBusy={isBusy}
                  pendingTierId={isBusy ? claim.tierId : null}
                  isAuthenticated={isAuthenticated}
                  onClaim={handleClaim}
                />
              </div>
            ))}
          </div>
        )}

        <RedemptionMechanics />
      </div>
    </div>
  );
}

function UserStandingCard({
  dashboard,
  walletBalanceLabel,
  isAuthenticated,
}: {
  dashboard: DashboardSummaryWithChainDTO | null;
  walletBalanceLabel: string | null;
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <div className="flex min-w-[260px] flex-col gap-3 rounded-2xl border border-white/5 bg-surface-container p-5">
        <p className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Sign in to check eligibility
        </p>
        <ConnectWalletButton className="w-full rounded-full bg-primary px-5 py-2.5 font-headline text-xs font-black uppercase tracking-widest text-on-primary transition-all hover:scale-[1.02] active:scale-95" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-w-[260px] animate-pulse rounded-2xl border border-white/5 bg-surface-container p-5">
        <div className="mb-2 h-3 w-20 rounded bg-surface-container-high" />
        <div className="h-6 w-32 rounded bg-surface-container-high" />
      </div>
    );
  }

  const qualified = dashboard.prize.qualified;
  const currentTier = dashboard.prize.currentTier;
  const prizeRank = dashboard.prize.prizeRank;

  return (
    <div className="min-w-[280px] rounded-2xl border border-white/5 bg-surface-container p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Your Standing
        </p>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
            qualified
              ? "bg-primary/20 text-primary"
              : "bg-secondary/20 text-secondary"
          }`}
        >
          {qualified ? "Qualified" : "Not Qualified"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
            Wallet Balance
          </p>
          <p className="font-headline text-lg font-bold text-on-surface">
            {walletBalanceLabel ?? "—"}{" "}
            <span className="text-xs text-on-surface-variant">BNDY</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
            Prize Rank
          </p>
          <p className="font-headline text-lg font-bold text-on-surface">
            {prizeRank != null ? `#${prizeRank}` : "—"}
          </p>
        </div>
      </div>
      {currentTier ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
          Eligible: {currentTier.displayName}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/5 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
          Earn {formatInteger(MIN_EARNED_TO_CLAIM_BNDY)} BNDY to qualify for a
          tier.
        </div>
      )}
    </div>
  );
}

function ClaimStatusBanner({ claim }: { claim: ClaimState }) {
  const label = (() => {
    switch (claim.stage) {
      case "requesting":
        return "Requesting claim voucher…";
      case "awaiting_wallet":
        return "Confirm the transaction in your wallet…";
      case "pending":
        return "Waiting for on-chain confirmation…";
      case "success":
        return "Claim confirmed. Soulbound trophy minted.";
      case "error":
        return claim.error ?? "Claim failed";
      default:
        return "";
    }
  })();

  const tone =
    claim.stage === "error"
      ? "border-error/40 bg-error/10 text-error"
      : claim.stage === "success"
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-white/10 bg-surface-container text-on-surface-variant";

  return (
    <div
      className={`mb-8 flex items-center justify-between rounded-2xl border p-4 text-sm ${tone}`}
    >
      <span>{label}</span>
      {claim.hash ? (
        <a
          className="font-bold underline-offset-4 hover:underline"
          href={explorerTxUrl(claim.hash)}
          rel="noreferrer"
          target="_blank"
        >
          View transaction
        </a>
      ) : null}
    </div>
  );
}

function PrizeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`xl:col-span-2 ${i === 0 ? "xl:col-start-2" : ""}`}
        >
          <div className="h-[420px] animate-pulse rounded-3xl border border-white/5 bg-surface-container-low" />
        </div>
      ))}
    </div>
  );
}

function PrizeCard({
  tier,
  userTierId,
  userCanClaim,
  activeClaimTierId,
  activeClaimStatus,
  isBusy,
  pendingTierId,
  isAuthenticated,
  onClaim,
}: {
  tier: PrizeTierDTO;
  userTierId: number | null;
  userCanClaim: boolean;
  activeClaimTierId: number | null;
  activeClaimStatus: "pending" | "confirmed" | null;
  isBusy: boolean;
  pendingTierId: number | null;
  isAuthenticated: boolean;
  onClaim: (tierId: number) => void;
}) {
  const remaining = tier.remaining;
  const stock = tier.stock;
  const soldOut = remaining <= 0;
  const stockPercent = stock > 0 ? Math.round((remaining / stock) * 100) : 0;
  const isUsersTier = userTierId === tier.tierId;
  const hasActiveClaim = activeClaimTierId != null;
  const isThisClaim = activeClaimTierId === tier.tierId;

  const buttonState = (() => {
    if (!isAuthenticated) {
      return {
        label: "Sign in to claim",
        disabled: true,
        variant: "locked" as const,
      };
    }
    if (isThisClaim && activeClaimStatus === "confirmed") {
      return {
        label: "Claimed",
        disabled: true,
        variant: "success" as const,
      };
    }
    if (isThisClaim && activeClaimStatus === "pending") {
      return {
        label: "Claim Pending",
        disabled: true,
        variant: "pending" as const,
      };
    }
    if (hasActiveClaim) {
      return {
        label: "Another Tier Claimed",
        disabled: true,
        variant: "locked" as const,
      };
    }
    if (soldOut) {
      return {
        label: "Sold Out",
        disabled: true,
        variant: "locked" as const,
      };
    }
    if (!isUsersTier) {
      return {
        label: "Rank Locked",
        disabled: true,
        variant: "locked" as const,
      };
    }
    if (!userCanClaim) {
      return {
        label: "Not Eligible",
        disabled: true,
        variant: "locked" as const,
      };
    }
    if (isBusy && pendingTierId === tier.tierId) {
      return {
        label: "Claiming…",
        disabled: true,
        variant: "pending" as const,
      };
    }
    if (isBusy) {
      return {
        label: "Claim Rewards",
        disabled: true,
        variant: "primary" as const,
      };
    }
    return {
      label: "Claim Rewards",
      disabled: false,
      variant: "primary" as const,
    };
  })();

  const badgeLabel = TIER_BADGE_LABEL[tier.tierId] ?? tier.displayName;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-surface-container-low transition-all hover:border-primary/30">
      <div className="relative h-56 overflow-hidden">
        <Image
          src={`/prizes/tier-${tier.tierId}-v5.png`}
          alt={tier.prize.name}
          fill
          sizes="(min-width: 1280px) 400px, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container-low/80 via-transparent to-transparent" />
        <div className="absolute left-4 top-4">
          <span
            className={`rounded-full border px-3 py-1 font-headline text-xs font-bold uppercase tracking-tight backdrop-blur-md ${
              isUsersTier
                ? "border-primary/40 bg-primary/20 text-primary"
                : "border-white/10 bg-surface-container-highest/80 text-on-surface-variant"
            }`}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="font-headline text-xl font-bold tracking-tight text-on-surface">
              {tier.prize.name}
            </h3>
            <div className="text-right">
              <span className="block font-headline text-sm font-bold text-primary">
                {tier.rankRequired === 1
                  ? "Rank #1"
                  : `Top ${tier.rankRequired}`}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Burns full wallet
              </span>
            </div>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">
            {tier.prize.description}
          </p>

          <div className="mb-6">
            <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span>Availability</span>
              <span
                className={
                  soldOut
                    ? "text-error"
                    : remaining <= stock * 0.3
                      ? "text-secondary"
                      : "text-primary"
                }
              >
                {soldOut ? "Sold Out" : `${remaining}/${stock} remaining`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className={`h-full transition-all ${
                  soldOut
                    ? "bg-error/60"
                    : remaining <= stock * 0.3
                      ? "bg-secondary"
                      : "bg-primary"
                }`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
          </div>
        </div>

        <ClaimButton
          state={buttonState}
          onClick={() => onClaim(tier.tierId)}
        />
      </div>
    </div>
  );
}

function ClaimButton({
  state,
  onClick,
}: {
  state: {
    label: string;
    disabled: boolean;
    variant: "primary" | "locked" | "pending" | "success";
  };
  onClick: () => void;
}) {
  const classes = (() => {
    switch (state.variant) {
      case "primary":
        return "bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-[0_10px_20px_rgba(46,204,113,0.2)] hover:scale-[1.02] active:scale-95";
      case "pending":
        return "bg-surface-container-high text-primary";
      case "success":
        return "bg-primary/20 text-primary border border-primary/40";
      case "locked":
      default:
        return "bg-surface-container-highest text-on-surface-variant/60 cursor-not-allowed opacity-60";
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state.disabled}
      className={`w-full rounded-full py-3.5 font-headline text-xs font-black uppercase tracking-widest transition-all ${classes}`}
    >
      {state.label}
    </button>
  );
}

function RedemptionMechanics() {
  return (
    <section className="mt-20 grid gap-10 md:grid-cols-2 md:items-start">
      <div>
        <h2 className="mb-6 font-headline text-3xl font-bold text-on-surface">
          Redemption <span className="italic text-primary">Mechanics</span>
        </h2>
        <ul className="space-y-6">
          <MechanicRow
            icon="local_fire_department"
            tone="primary"
            title="Full Balance Burn"
            body="Claiming a tier burns your entire BNDY wallet balance and resets your earned counter. The contract enforces this — there is no partial claim."
          />
          <MechanicRow
            icon="token"
            tone="secondary"
            title="Soulbound Trophy NFTs"
            body="Every confirmed claim mints a non-transferable Trophy NFT tied to your wallet. Trophies prove what you won — they cannot be sold or traded."
          />
          <MechanicRow
            icon="inventory_2"
            tone="neutral"
            title="Physical Fulfillment"
            body="For physical tiers, shipping is coordinated via wallet signature off-chain after on-chain confirmation. One active claim per wallet per tournament."
          />
        </ul>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-surface-container p-8">
        <div className="absolute right-4 top-4 opacity-10">
          <Icon name="verified_user" className="text-8xl" fill />
        </div>
        <h3 className="mb-3 font-headline text-xl font-bold text-on-surface">
          Two-Gate Eligibility
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">
          The backend and the on-chain contract both enforce{" "}
          <span className="font-bold text-primary">
            {formatInteger(MIN_EARNED_TO_CLAIM_BNDY)} BNDY earned
          </span>{" "}
          as the minimum to qualify. Trading or buying BNDY can change your
          rank, but can never bypass the earned-balance gate.
        </p>
        <div className="space-y-3">
          <GateRow label="Earned ≥ 10k BNDY" />
          <GateRow label="Rank inside tier band" />
          <GateRow label="Tier stock available" />
          <GateRow label="No prior active claim" />
        </div>
      </div>
    </section>
  );
}

function MechanicRow({
  icon,
  tone,
  title,
  body,
}: {
  icon: string;
  tone: "primary" | "secondary" | "neutral";
  title: string;
  body: string;
}) {
  const toneClasses =
    tone === "primary"
      ? "bg-primary/10 border-primary/20 text-primary"
      : tone === "secondary"
        ? "bg-secondary/10 border-secondary/20 text-secondary"
        : "bg-white/5 border-white/10 text-on-surface";

  return (
    <li className="flex gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneClasses}`}
      >
        <Icon name={icon} fill />
      </div>
      <div>
        <h4 className="mb-1 font-headline font-bold text-on-surface">
          {title}
        </h4>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          {body}
        </p>
      </div>
    </li>
  );
}

function GateRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-surface-container-low px-4 py-2.5">
      <Icon name="check_circle" className="text-primary text-lg" fill />
      <span className="text-sm text-on-surface">{label}</span>
    </div>
  );
}
