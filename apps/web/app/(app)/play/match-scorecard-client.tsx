"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { queryKeys } from "@/lib/queries";
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

function formatMatchDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function playerPoints(player: ScorecardPlayer): number {
  return player.stats?.pointsAwarded ?? -1;
}

function describePlayerStatline(player: ScorecardPlayer): string {
  if (!player.stats) {
    return player.scored ? "No official fantasy line yet" : "Did not play";
  }

  const parts: string[] = [];

  if (player.stats.runs > 0) {
    parts.push(`${player.stats.runs} runs`);
  }
  if (player.stats.wickets > 0) {
    parts.push(`${player.stats.wickets} wickets`);
  }
  if (player.stats.catches > 0) {
    parts.push(`${player.stats.catches} catches`);
  }
  if (player.stats.runOuts > 0) {
    parts.push(`${player.stats.runOuts} run-outs`);
  }
  if (player.stats.stumpings > 0) {
    parts.push(`${player.stats.stumpings} stumpings`);
  }
  if (player.stats.dismissedForZero) {
    parts.push("duck penalty");
  }

  return parts.length > 0
    ? parts.slice(0, 2).join(" • ")
    : "No major fantasy events";
}

function TeamLogoPuck({
  team,
  large = false,
}: {
  team: TeamMeta;
  large?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-surface-container-high shadow-xl ${large ? "h-28 w-28 rounded-full p-2 md:h-32 md:w-32" : "h-14 w-14 rounded-[1.75rem] p-1 md:h-16 md:w-16"}`}
      style={{
        boxShadow: `0 18px 36px ${team.accentColor}22`,
        outline: `1px solid ${team.accentColor}44`,
      }}
    >
      {team.logoPath ? (
        <Image
          src={team.logoPath}
          alt={team.name}
          fill
          className="object-contain p-1.5"
          sizes={large ? "96px" : "64px"}
        />
      ) : (
        <span
          className="font-headline text-lg font-bold"
          style={{ color: team.accentColor }}
        >
          {team.shortCode}
        </span>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/65">
        {label}
      </p>
      <p className="mt-2 font-headline text-3xl font-bold text-on-surface">
        {value}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
    </div>
  );
}

function InsightCard({
  eyebrow,
  title,
  body,
  value,
}: {
  eyebrow: string;
  title: string;
  body: string;
  value: string;
}) {
  return (
    <div className="h-full rounded-[1.75rem] bg-surface-container px-5 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
        {eyebrow}
      </p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            {body}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container-high px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">
            Points
          </p>
          <p className="font-headline text-2xl font-bold text-primary">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TopPerformerCard({
  player,
  rank,
  accentColor,
  featured = false,
}: {
  player: ScorecardPlayer;
  rank: number;
  accentColor: string;
  featured?: boolean;
}) {
  const stats = player.stats;
  const fieldingTotal = stats
    ? stats.catches + stats.runOuts + stats.stumpings
    : 0;
  const playerInitials = player.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] bg-surface-container-low ${featured ? "p-6 md:p-7" : "p-5"}`}
      style={{ outline: `1px solid ${accentColor}22` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70"
        style={{
          background: `linear-gradient(180deg, ${accentColor}22 0%, rgba(0,0,0,0) 100%)`,
        }}
      />
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
              Match Top Performer #{String(rank).padStart(2, "0")}
            </p>
            <h3
              className={`mt-2 font-headline font-bold uppercase tracking-[0.04em] text-on-surface ${featured ? "text-3xl md:text-4xl" : "text-xl"}`}
            >
              {player.name}
            </h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant/75">
              {ROLE_DISPLAY[player.role] ?? player.role} • {player.team}
            </p>
          </div>
          {player.inUserSquad ? (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Your Pick
            </span>
          ) : null}
        </div>

        {featured ? (
          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(220px,260px)] md:items-center">
            {player.photoUrl ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-surface-container-high md:h-28 md:w-28">
                <Image
                  src={player.photoUrl}
                  alt={player.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white md:h-28 md:w-28"
                style={{ backgroundColor: `${accentColor}40` }}
              >
                {playerInitials}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                Fantasy Points
              </p>
              <p className="font-headline text-5xl font-bold text-primary md:text-6xl">
                {stats?.pointsAwarded ?? 0}
              </p>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {describePlayerStatline(player)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-container px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                  Runs / Wkts
                </p>
                <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                  {stats ? `${stats.runs} / ${stats.wickets}` : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-container px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                  Fielding
                </p>
                <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                  {fieldingTotal}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              {player.photoUrl ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-full bg-surface-container-high">
                  <Image
                    src={player.photoUrl}
                    alt={player.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: `${accentColor}40` }}
                >
                  {playerInitials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                  Fantasy Points
                </p>
                <p className="font-headline text-4xl font-bold text-primary">
                  {stats?.pointsAwarded ?? 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-container px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                  Runs / Wkts
                </p>
                <p className="mt-2 font-headline text-xl font-bold text-on-surface">
                  {stats ? `${stats.runs} / ${stats.wickets}` : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-container px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                  Fielding
                </p>
                <p className="mt-2 font-headline text-xl font-bold text-on-surface">
                  {fieldingTotal}
                </p>
              </div>
            </div>

            <p className="text-sm leading-6 text-on-surface-variant">
              {describePlayerStatline(player)}
            </p>
          </>
        )}
      </div>
    </article>
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
    <div className="flex flex-col items-center rounded-xl bg-surface-container-high px-3 py-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/55">
        {label}
      </span>
      <span
        className={`mt-1 font-headline text-sm font-bold ${highlight ? "text-primary" : "text-on-surface"}`}
      >
        {value}
      </span>
    </div>
  );
}

function PlayerScoreCard({
  player,
  teamAName,
  teamAColor,
  teamBColor,
}: {
  player: ScorecardPlayer;
  teamAName: string;
  teamAColor: string;
  teamBColor: string;
}) {
  const teamColor = player.team === teamAName ? teamAColor : teamBColor;

  return (
    <article
      className={`relative flex flex-col gap-4 rounded-[1.75rem] px-4 py-4 sm:px-5 ${player.inUserSquad ? "bg-primary/5" : "bg-surface-container"}`}
      style={{
        outline: `1px solid ${player.inUserSquad ? "rgba(84,233,138,0.18)" : "rgba(134,148,134,0.12)"}`,
      }}
    >
      {player.inUserSquad ? (
        <div className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary">
          Your Pick
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 pr-20 lg:pr-0">
          {player.photoUrl ? (
            <Image
              src={player.photoUrl}
              alt={player.name}
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 2px ${teamColor}` }}
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: `${teamColor}40` }}
            >
              {player.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h4 className="truncate font-headline text-lg font-bold text-on-surface">
              {player.name}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                className="font-bold uppercase tracking-[0.18em]"
                style={{ color: teamColor }}
              >
                {player.team}
              </span>
              <span className="text-on-surface-variant/50">•</span>
              <span className="text-on-surface-variant">
                {ROLE_DISPLAY[player.role] ?? player.role}
              </span>
            </div>
          </div>
        </div>

        {player.stats ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <StatPill label="Runs" value={player.stats.runs} />
            <StatPill label="Wkts" value={player.stats.wickets} />
            <StatPill label="Catches" value={player.stats.catches} />
            {player.stats.runOuts > 0 ? (
              <StatPill label="R/O" value={player.stats.runOuts} />
            ) : null}
            {player.stats.stumpings > 0 ? (
              <StatPill label="Stmp" value={player.stats.stumpings} />
            ) : null}
            {player.stats.dismissedForZero ? (
              <span className="inline-flex items-center rounded-full bg-error/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-error">
                Duck
              </span>
            ) : null}
            <StatPill
              label="Points"
              value={player.stats.pointsAwarded}
              highlight
            />
          </div>
        ) : (
          <div className="text-sm text-on-surface-variant/55">
            {player.scored ? "Official fantasy line pending" : "Did not play"}
          </div>
        )}
      </div>

      <p className="text-sm text-on-surface-variant">
        {describePlayerStatline(player)}
      </p>
    </article>
  );
}

export function MatchScorecardClient({ matchId }: Props) {
  const { isAuthenticated, address, token } = useAuth();
  const [view, setView] = useState<ViewMode>("all");

  const scorecardQuery = useQuery({
    queryKey:
      address && matchId
        ? queryKeys.matchScorecard(matchId, address)
        : ["match-scorecard", "none"],
    queryFn: () =>
      apiFetch<ScorecardResponse>(`/api/matches/${matchId}/scorecard`, {
        token: token!,
      }),
    enabled: Boolean(isAuthenticated && token && matchId && address),
  });
  const data = scorecardQuery.data ?? null;
  const loading = scorecardQuery.isLoading && !data;
  const error =
    scorecardQuery.error instanceof Error ? scorecardQuery.error.message : null;

  const squadPlayers = useMemo(
    () => data?.players.filter((player) => player.inUserSquad) ?? [],
    [data],
  );

  const scoredPlayers = useMemo(
    () =>
      [...(data?.players ?? [])]
        .filter((player) => player.stats)
        .sort((a, b) => playerPoints(b) - playerPoints(a)),
    [data],
  );

  const topPerformers = useMemo(
    () => scoredPlayers.slice(0, 4),
    [scoredPlayers],
  );

  const topSquadPerformer = useMemo(
    () => scoredPlayers.find((player) => player.inUserSquad) ?? null,
    [scoredPlayers],
  );

  const topMissedPerformer = useMemo(
    () => scoredPlayers.find((player) => !player.inUserSquad) ?? null,
    [scoredPlayers],
  );

  const scoredSquadCount = useMemo(
    () => squadPlayers.filter((player) => player.stats).length,
    [squadPlayers],
  );

  const displayPlayers = useMemo(() => {
    if (!data) return [];
    if (view === "squad") {
      return data.players.filter((player) => player.inUserSquad);
    }
    return data.players;
  }, [data, view]);

  const teamAPlayers = useMemo(
    () =>
      displayPlayers.filter((player) => player.team === data?.match.teamA.name),
    [displayPlayers, data],
  );

  const teamBPlayers = useMemo(
    () =>
      displayPlayers.filter((player) => player.team === data?.match.teamB.name),
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
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
        <div className="h-[320px] animate-pulse rounded-[2rem] bg-surface-container-low" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="h-[380px] animate-pulse rounded-[2rem] bg-surface-container" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-[1.75rem] bg-surface-container" />
            <div className="h-32 animate-pulse rounded-[1.75rem] bg-surface-container" />
            <div className="h-32 animate-pulse rounded-[1.75rem] bg-surface-container" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[1.75rem] bg-surface-container"
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
          onClick={() => void scorecardQuery.refetch()}
          className="mt-2 rounded-full px-5 py-2.5 font-headline text-sm font-bold text-on-primary pitch-gradient"
        >
          Retry
        </button>
      </div>
    );
  }

  const { match } = data;
  const isLive = match.status === "live";
  const squadTeamACount = squadPlayers.filter(
    (player) => player.team === match.teamA.name,
  ).length;
  const squadTeamBCount = squadPlayers.filter(
    (player) => player.team === match.teamB.name,
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" className="text-base" />
          Back to Dashboard
        </Link>
      </div>

      <section className="stadium-gradient relative overflow-hidden rounded-[2.25rem] bg-surface-container-low px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(84,233,138,0.18),transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${isLive ? "bg-error/10 text-error" : "bg-primary/12 text-primary"}`}
            >
              {isLive ? "Match Live" : "Match Completed"}
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant/70">
              Scorecard View
            </span>
          </div>

          <div className="mt-6 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col items-start gap-4">
              <TeamLogoPuck team={match.teamA} large />
              <div className="min-w-0">
                <p className="whitespace-nowrap font-headline text-3xl font-bold text-on-surface md:text-4xl">
                  {match.teamAScore ?? "-"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="scoreboard-wordmark text-3xl md:text-4xl">
                <span>{match.teamA.shortCode}</span>
                <span className="scoreboard-vs">vs</span>
                <span>{match.teamB.shortCode}</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/65">
                  {match.venue ?? "PSL 2026"}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {formatMatchDate(match.playedAt ?? match.scheduledAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 md:items-end">
              <TeamLogoPuck team={match.teamB} large />
              <div className="min-w-0 text-left md:text-right">
                <p className="whitespace-nowrap font-headline text-3xl font-bold text-on-surface md:text-4xl">
                  {match.teamBScore ?? "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat
              label="Your Squad Points"
              value={formatInteger(data.userSquadPoints)}
              hint={
                data.hasUserSquad
                  ? "Cumulative fantasy points from your 11 picks"
                  : "No squad submitted for this match"
              }
            />
            <SummaryStat
              label="Scored Picks"
              value={data.hasUserSquad ? `${scoredSquadCount}/11` : "0/11"}
              hint="Selected players with an official fantasy line"
            />
            <SummaryStat
              label="Player Pool"
              value={formatInteger(scoredPlayers.length)}
              hint="Players with recorded fantasy output in this match"
            />
            <SummaryStat
              label="View Focus"
              value={view === "all" ? "All" : "Squad"}
              hint="Switch between the full scorecard and your own XI"
            />
          </div>

          <div className="mt-6 rounded-[2rem] bg-surface-container p-5 md:p-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
                  Squad Performance
                </p>
                <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
                  Your Match Readout
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  Real scorecard signals only: your best pick, coverage across
                  both franchises, and the biggest threat you left out.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="h-full rounded-[1.5rem] bg-surface-container-high px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                    Best Pick
                  </p>
                  <p className="mt-2 font-headline text-xl font-bold text-on-surface">
                    {topSquadPerformer
                      ? topSquadPerformer.name
                      : "No scored pick yet"}
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {topSquadPerformer
                      ? describePlayerStatline(topSquadPerformer)
                      : "Your selected players have not posted an official fantasy contribution yet."}
                  </p>
                </div>

                <div className="h-full rounded-[1.5rem] bg-surface-container-high px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                    Squad Split
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-surface-container px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-on-surface">
                        {match.teamA.shortCode}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {match.teamA.name}
                      </p>
                    </div>
                    <p className="font-headline text-2xl font-bold text-on-surface">
                      {squadTeamACount}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-surface-container px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-on-surface">
                        {match.teamB.shortCode}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {match.teamB.name}
                      </p>
                    </div>
                    <p className="font-headline text-2xl font-bold text-on-surface">
                      {squadTeamBCount}
                    </p>
                  </div>
                </div>

                <div className="h-full rounded-[1.5rem] bg-surface-container-high px-4 py-4 md:col-span-2 xl:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/55">
                    Biggest Outside Threat
                  </p>
                  <p className="mt-2 font-headline text-xl font-bold text-on-surface">
                    {topMissedPerformer ? topMissedPerformer.name : "None yet"}
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {topMissedPerformer
                      ? describePlayerStatline(topMissedPerformer)
                      : "Every scored standout so far is already in your squad."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <div className="rounded-[2rem] bg-surface-container-low p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
                Match Top Performers
              </p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
                Fantasy leaderboard for this fixture
              </h2>
            </div>
            <div className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Real scorecard data
            </div>
          </div>

          {topPerformers.length > 0 ? (
            <div className="mt-6 space-y-4">
              <TopPerformerCard
                player={topPerformers[0]!}
                rank={1}
                accentColor={
                  topPerformers[0]!.team === match.teamA.name
                    ? match.teamA.accentColor
                    : match.teamB.accentColor
                }
                featured
              />

              {topPerformers.length > 1 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {topPerformers.slice(1).map((player, index) => (
                    <TopPerformerCard
                      key={player.id}
                      player={player}
                      rank={index + 2}
                      accentColor={
                        player.team === match.teamA.name
                          ? match.teamA.accentColor
                          : match.teamB.accentColor
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.75rem] bg-surface-container px-6 py-8 text-center">
              <p className="font-headline text-xl font-bold text-on-surface">
                Waiting for official player lines
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Top performers will appear here once fantasy scoring is
                recorded.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-surface-container-low p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
              Full Scorecard
            </p>
            <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
              Player-by-player fantasy output
            </h2>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-surface-container p-1.5">
            <button
              type="button"
              onClick={() => setView("all")}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${view === "all" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
            >
              All Players
            </button>
            <button
              type="button"
              onClick={() => setView("squad")}
              disabled={!data.hasUserSquad}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${view === "squad" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
            >
              Your Squad
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-8">
          {teamAPlayers.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center gap-3 px-1">
                <div
                  className="h-6 w-1 rounded-full"
                  style={{ backgroundColor: match.teamA.accentColor }}
                />
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  {match.teamA.name}
                </h3>
                <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant/65">
                  {teamAPlayers.length} players
                </span>
              </div>
              <div className="space-y-3">
                {teamAPlayers.map((player) => (
                  <PlayerScoreCard
                    key={player.id}
                    player={player}
                    teamAName={match.teamA.name}
                    teamAColor={match.teamA.accentColor}
                    teamBColor={match.teamB.accentColor}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {teamBPlayers.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center gap-3 px-1">
                <div
                  className="h-6 w-1 rounded-full"
                  style={{ backgroundColor: match.teamB.accentColor }}
                />
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  {match.teamB.name}
                </h3>
                <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant/65">
                  {teamBPlayers.length} players
                </span>
              </div>
              <div className="space-y-3">
                {teamBPlayers.map((player) => (
                  <PlayerScoreCard
                    key={player.id}
                    player={player}
                    teamAName={match.teamA.name}
                    teamAColor={match.teamA.accentColor}
                    teamBColor={match.teamB.accentColor}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {displayPlayers.length === 0 && view === "squad" ? (
            <div className="rounded-[1.75rem] bg-surface-container px-8 py-10 text-center">
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
