"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type DashboardSummaryDTO,
  type DashboardMatchActivityDTO,
  type FixturesResponseDTO,
} from "@boundaryline/shared";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { AppChrome } from "@/components/dashboard-page";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, ApiClientError } from "@/lib/api-client";

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

function TeamLogoPuck({ side }: { side: DashboardMatchActivityDTO["teamA"] }) {
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

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTimeLabel(scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(scheduledAt));
}

function fixtureStatusLabel(
  status: DashboardMatchActivityDTO["status"],
): string {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "live") {
    return "Live";
  }

  return "Scheduled";
}

function EmptyFixturesState() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="glass-panel max-w-xl rounded-[2rem] border border-white/10 p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="text-4xl" name="calendar_month" />
        </div>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
          Link your wallet to browse the schedule
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          BoundaryLine shows the full PSL fixture list inside the authenticated
          app so you can track completed and upcoming matches alongside your
          dashboard.
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

function LoadingFixturesState() {
  return (
    <div className="space-y-6">
      <div className="h-48 animate-pulse rounded-[2rem] bg-surface-container-low" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-[2rem] bg-surface-container" />
        <div className="h-28 animate-pulse rounded-[2rem] bg-surface-container" />
        <div className="h-28 animate-pulse rounded-[2rem] bg-surface-container" />
      </div>
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-[2rem] bg-surface-container-low" />
        <div className="h-32 animate-pulse rounded-[2rem] bg-surface-container-low" />
        <div className="h-32 animate-pulse rounded-[2rem] bg-surface-container-low" />
      </div>
    </div>
  );
}

function FixturesErrorState({
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
          Fixtures unavailable
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

export function FixturesPage() {
  const { isAuthenticated, status, token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSummaryDTO | null>(null);
  const [fixtures, setFixtures] = useState<DashboardMatchActivityDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFixturesPage = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      setFixtures([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [nextDashboard, fixturesResponse] = await Promise.all([
        apiFetch<DashboardSummaryDTO>("/api/dashboard/me", { token }),
        apiFetch<FixturesResponseDTO>("/api/fixtures", { token }),
      ]);
      setDashboard(nextDashboard);
      setFixtures(fixturesResponse.fixtures);
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to load fixtures",
      );
      setDashboard(null);
      setFixtures([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadFixturesPage();
      return;
    }

    setDashboard(null);
    setFixtures([]);
    setError(null);
    setIsLoading(false);
  }, [isAuthenticated, loadFixturesPage]);

  const groupedFixtures = useMemo(() => {
    const groups = new Map<string, DashboardMatchActivityDTO[]>();

    for (const fixture of fixtures) {
      const key = fixture.scheduledAt.slice(0, 10);
      const existing = groups.get(key);
      if (existing) {
        existing.push(fixture);
      } else {
        groups.set(key, [fixture]);
      }
    }

    return Array.from(groups.entries()).map(([key, matches]) => ({
      dateLabel: formatFullDate(
        matches[0]?.scheduledAt ?? `${key}T00:00:00.000Z`,
      ),
      key,
      matches,
    }));
  }, [fixtures]);

  if (
    !isAuthenticated ||
    status === "disconnected" ||
    status === "connected" ||
    status === "wrong-network"
  ) {
    return <EmptyFixturesState />;
  }

  if (isLoading && !dashboard) {
    return <LoadingFixturesState />;
  }

  if (error && !dashboard) {
    return (
      <FixturesErrorState
        error={error}
        onRetry={() => void loadFixturesPage()}
      />
    );
  }

  if (!dashboard) {
    return <LoadingFixturesState />;
  }

  return (
    <AppChrome>
      <div className="space-y-8">
        <section className="rounded-[2rem] bg-surface-container-low p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Full Schedule
              </p>
              <h1 className="mt-2 font-headline text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
                PSL 2026 Fixtures
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Full tournament calendar for BoundaryLine, including completed
                fixtures, the remaining league-stage schedule, and playoff
                placeholders.
              </p>
            </div>

            <Link
              className="inline-flex items-center gap-2 self-start rounded-full border border-outline-variant/20 px-5 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-primary/40 hover:text-primary"
              href="/dashboard"
            >
              <Icon className="text-base" name="arrow_back" />
              Back to dashboard
            </Link>
          </div>
        </section>

        <div className="space-y-8">
          {groupedFixtures.map((group) => (
            <section key={group.key} className="space-y-4">
              <div className="px-2">
                <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                  {group.dateLabel}
                </h2>
              </div>

              <div className="space-y-4">
                {group.matches.map((fixture) => (
                  <div
                    key={`${fixture.status}-${fixture.id}`}
                    className="flex flex-col items-center gap-6 rounded-[2rem] bg-surface-container-low p-6 transition-colors hover:bg-surface-container-highest md:flex-row"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex -space-x-4">
                        {[fixture.teamA, fixture.teamB].map((side) => (
                          <TeamLogoPuck key={side.name} side={side} />
                        ))}
                      </div>
                      <div>
                        <h3 className="font-headline text-lg font-bold text-on-surface">
                          {fixture.teamA.name} vs {fixture.teamB.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {fixture.venue ?? "Venue TBD"} ·{" "}
                          {formatDateTimeLabel(fixture.scheduledAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          Status
                        </p>
                        <p className="font-headline text-xl font-bold text-on-surface">
                          {fixtureStatusLabel(fixture.status)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppChrome>
  );
}
