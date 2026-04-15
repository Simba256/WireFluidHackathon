"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";

const ROLE_DISPLAY: Record<string, string> = {
  batsman: "Batter",
  bowler: "Bowler",
  "all-rounder": "All-Rounder",
  wicketkeeper: "Wk-Batter",
};

interface TeamMeta {
  name: string;
  shortCode: string;
  logoPath: string;
  accentColor: string;
}

interface PlayerStats {
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissedForZero: boolean;
  pointsAwarded: number;
}

interface ScorecardPlayer {
  id: number;
  name: string;
  team: string;
  role: string;
  photoUrl: string | null;
  inUserSquad: boolean;
  scored: boolean;
  stats: PlayerStats | null;
}

interface ScorecardMatch {
  id: number;
  teamA: TeamMeta;
  teamB: TeamMeta;
  venue: string | null;
  scheduledAt: string;
  status: string;
  playedAt: string | null;
  teamAScore: string | null;
  teamBScore: string | null;
}

interface ScorecardResponse {
  match: ScorecardMatch;
  players: ScorecardPlayer[];
  userSquadPoints: number;
  hasUserSquad: boolean;
}

interface Props {
  matchId: number;
}

type ViewMode = "all" | "squad";

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMatchDate(scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(scheduledAt));
}

function TeamLogoPuck({ team }: { team: TeamMeta }) {
  return (
    <div
      className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high p-1 shadow-xl md:h-16 md:w-16"
      style={{
        boxShadow: `0 12px 30px ${team.accentColor}26`,
        outline: `1px solid ${team.accentColor}55`,
      }}
    >
      {team.logoPath ? (
        <Image
          src={team.logoPath}
          alt={team.name}
          fill
          className="object-contain p-1.5"
          sizes="64px"
        />
      ) : (
        <span
          className="font-headline text-base font-bold"
          style={{ color: team.accentColor }}
        >
          {team.shortCode}
        </span>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50">
        {label}
      </span>
      <span
        className={`font-headline text-sm font-bold ${highlight ? "text-primary" : "text-on-surface"}`}
      >
        {value}
      </span>
    </div>
  );
}

function PlayerScoreCard({
  p,
  teamAName,
  teamAColor,
  teamBColor,
}: {
  p: ScorecardPlayer;
  teamAName: string;
  teamAColor: string;
  teamBColor: string;
}) {
  const teamColor = p.team === teamAName ? teamAColor : teamBColor;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${
        p.inUserSquad
          ? "border-primary/30 bg-primary/5"
          : "border-outline-variant/15 bg-surface-container"
      }`}
    >
      {p.inUserSquad && (
        <div className="absolute -top-2 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-on-primary">
          <Icon name="check" className="text-xs" />
          Your Pick
        </div>
      )}

      <div className="flex items-center gap-3 sm:w-[200px] sm:shrink-0">
        {p.photoUrl ? (
          <Image
            src={p.photoUrl}
            alt={p.name}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2"
            style={{ ["--tw-ring-color" as string]: teamColor } as React.CSSProperties}
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: `${teamColor}40` }}
          >
            {p.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-headline text-sm font-bold text-on-surface">
            {p.name}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: teamColor }}
            >
              {p.team}
            </span>
            <span className="text-[10px] text-on-surface-variant/50">
              {ROLE_DISPLAY[p.role] ?? p.role}
            </span>
          </div>
        </div>
      </div>

      {p.stats ? (
        <div className="flex flex-1 flex-wrap items-center gap-4 sm:justify-end">
          <StatPill label="Runs" value={p.stats.runs} />
          <StatPill label="Wkts" value={p.stats.wickets} />
          <StatPill label="Catches" value={p.stats.catches} />
          {p.stats.runOuts > 0 && (
            <StatPill label="R/O" value={p.stats.runOuts} />
          )}
          {p.stats.stumpings > 0 && (
            <StatPill label="Stmp" value={p.stats.stumpings} />
          )}
          {p.stats.dismissedForZero && (
            <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold text-error">
              Duck
            </span>
          )}
          <div className="ml-auto flex flex-col items-center rounded-xl bg-surface-container-high px-3 py-1.5 sm:ml-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50">
              Points
            </span>
            <span className="font-headline text-lg font-bold text-primary">
              {p.stats.pointsAwarded}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-end">
          <span className="text-xs text-on-surface-variant/40">
            {p.scored ? "—" : "Did not play"}
          </span>
        </div>
      )}
    </div>
  );
}

export function MatchScorecardClient({ matchId }: Props) {
  const { isAuthenticated, token } = useAuth();
  const [data, setData] = useState<ScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("all");

  const loadScorecard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ScorecardResponse>(
        `/api/matches/${matchId}/scorecard`,
        { token },
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scorecard");
    } finally {
      setLoading(false);
    }
  }, [token, matchId]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadScorecard();
    }
  }, [isAuthenticated, loadScorecard]);

  const displayPlayers = useMemo(() => {
    if (!data) return [];
    if (view === "squad") return data.players.filter((p) => p.inUserSquad);
    return data.players;
  }, [data, view]);

  const teamAPlayers = useMemo(
    () => displayPlayers.filter((p) => p.team === data?.match.teamA.name),
    [displayPlayers, data],
  );
  const teamBPlayers = useMemo(
    () => displayPlayers.filter((p) => p.team === data?.match.teamB.name),
    [displayPlayers, data],
  );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Icon name="lock" className="text-5xl text-on-surface-variant/40" />
        <h2 className="font-headline text-2xl font-bold text-on-surface">
          Connect Your Wallet
        </h2>
        <p className="max-w-md text-on-surface-variant">
          Link your wallet to view the match scorecard.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-container-low" />
        <div className="h-12 animate-pulse rounded-xl bg-surface-container" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-surface-container"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Icon name="error" className="text-5xl text-error/60" />
        <h2 className="font-headline text-2xl font-bold text-on-surface">
          Scorecard Unavailable
        </h2>
        <p className="max-w-md text-on-surface-variant">
          {error ?? "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={() => void loadScorecard()}
          className="mt-2 rounded-full px-5 py-2.5 font-headline text-sm font-bold text-on-primary pitch-gradient"
        >
          Retry
        </button>
      </div>
    );
  }

  const { match: m } = data;
  const isLive = m.status === "live";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" className="text-base" />
          Back to Dashboard
        </Link>
      </div>

      {/* Match header card */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 md:p-8">
        <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Team A */}
          <div className="flex items-center gap-4">
            <TeamLogoPuck team={m.teamA} />
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface md:text-2xl">
                {m.teamA.name}
              </h2>
              {m.teamAScore && (
                <p className="font-headline text-sm font-bold text-primary">
                  {m.teamAScore}
                </p>
              )}
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-1">
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1 text-xs font-bold uppercase text-error">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" />
                Live
              </span>
            ) : (
              <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase text-on-surface-variant">
                Completed
              </span>
            )}
            <span className="text-[10px] text-on-surface-variant/50">
              {m.venue ?? ""} · {formatMatchDate(m.scheduledAt)}
            </span>
          </div>

          {/* Team B */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <h2 className="font-headline text-xl font-bold text-on-surface md:text-2xl">
                {m.teamB.name}
              </h2>
              {m.teamBScore && (
                <p className="font-headline text-sm font-bold text-primary">
                  {m.teamBScore}
                </p>
              )}
            </div>
            <TeamLogoPuck team={m.teamB} />
          </div>
        </div>

        <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-secondary/5 blur-3xl" />
      </section>

      {/* User squad summary bar */}
      {data.hasUserSquad && (
        <section className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Icon name="groups" className="text-lg text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">
                Your Squad Points
              </p>
              <p className="text-xs text-on-surface-variant">
                Cumulative points from your 11 picks this match
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-headline text-3xl font-bold text-primary">
              {formatInteger(data.userSquadPoints)}
            </span>
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              pts
            </span>
          </div>
        </section>
      )}

      {/* View toggle */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setView("all")}
          className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
            view === "all"
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
          }`}
        >
          All Players
        </button>
        <button
          type="button"
          onClick={() => setView("squad")}
          disabled={!data.hasUserSquad}
          className={`rounded-full px-5 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${
            view === "squad"
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
          }`}
        >
          Your Squad
        </button>
      </div>

      {/* Player cards grouped by team */}
      <div className="mt-6 space-y-8">
        {teamAPlayers.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-3 px-1">
              <div
                className="h-4 w-1 rounded-full"
                style={{ backgroundColor: m.teamA.accentColor }}
              />
              <h3 className="font-headline text-lg font-bold text-on-surface">
                {m.teamA.name}
              </h3>
              <span className="text-xs text-on-surface-variant">
                {teamAPlayers.length} players
              </span>
            </div>
            <div className="space-y-3">
              {teamAPlayers.map((p) => (
                <PlayerScoreCard
                  key={p.id}
                  p={p}
                  teamAName={m.teamA.name}
                  teamAColor={m.teamA.accentColor}
                  teamBColor={m.teamB.accentColor}
                />
              ))}
            </div>
          </div>
        )}

        {teamBPlayers.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-3 px-1">
              <div
                className="h-4 w-1 rounded-full"
                style={{ backgroundColor: m.teamB.accentColor }}
              />
              <h3 className="font-headline text-lg font-bold text-on-surface">
                {m.teamB.name}
              </h3>
              <span className="text-xs text-on-surface-variant">
                {teamBPlayers.length} players
              </span>
            </div>
            <div className="space-y-3">
              {teamBPlayers.map((p) => (
                <PlayerScoreCard
                  key={p.id}
                  p={p}
                  teamAName={m.teamA.name}
                  teamAColor={m.teamA.accentColor}
                  teamBColor={m.teamB.accentColor}
                />
              ))}
            </div>
          </div>
        )}

        {displayPlayers.length === 0 && view === "squad" && (
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-8 text-center">
            <Icon
              name="groups"
              className="text-4xl text-on-surface-variant/30"
            />
            <p className="mt-3 font-headline text-lg font-bold text-on-surface">
              No squad selected for this match
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              You did not pick a squad before this match started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
