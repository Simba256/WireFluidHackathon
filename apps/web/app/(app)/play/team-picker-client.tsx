"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, ApiClientError } from "@/lib/api-client";

const ROLE_LABELS: Record<string, string> = {
  batsman: "BAT",
  bowler: "BOWL",
  "all-rounder": "AR",
  wicketkeeper: "WK",
};

const ROLE_DISPLAY: Record<string, string> = {
  batsman: "Batter",
  bowler: "Bowler",
  "all-rounder": "All-Rounder",
  wicketkeeper: "Wk-Batter",
};

const FILTER_TABS = ["ALL", "BAT", "BOWL", "AR", "WK"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const TAB_TO_ROLE: Record<Exclude<FilterTab, "ALL">, string> = {
  BAT: "batsman",
  BOWL: "bowler",
  AR: "all-rounder",
  WK: "wicketkeeper",
};

interface PlayerData {
  id: number;
  name: string;
  team: string;
  role: string;
  photoUrl: string | null;
}

interface MatchData {
  id: number;
  teamA: string;
  teamB: string;
  venue: string | null;
  scheduledAt: string;
  status: "live" | "scheduled" | "completed";
}

interface Props {
  players: PlayerData[];
  currentMatch: MatchData | null;
  teamSize: number;
}

interface SelectedTeamResponse {
  selectedTeam: {
    id: number;
    matchId: number;
    playerIds: number[];
    players: PlayerData[];
  } | null;
  matchStatus: string;
}

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

function formatMatchDate(scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(scheduledAt));
}

export function TeamPickerClient({
  players,
  currentMatch,
  teamSize,
}: Props) {
  const { isAuthenticated, token } = useAuth();

  const [selected, setSelected] = useState<PlayerData[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<FilterTab>("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>(
    currentMatch?.status ?? "scheduled",
  );

  const isLocked = matchStatus !== "scheduled";
  const matchId = currentMatch?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated || !token || !matchId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<SelectedTeamResponse>(
          `/api/selected-teams?matchId=${matchId}`,
          { token },
        );
        if (cancelled) return;

        setMatchStatus(res.matchStatus);

        if (res.selectedTeam?.players) {
          setSelected(res.selectedTeam.players);
          setSaved(true);
        }
      } catch (err) {
        if (!(err instanceof ApiClientError && err.code === "NOT_FOUND")) {
          // unexpected error
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, matchId]);

  const selectedIds = useMemo(
    () => new Set(selected.map((p) => p.id)),
    [selected],
  );

  const filtered = useMemo(() => {
    let list = players;
    if (roleFilter !== "ALL") {
      const role = TAB_TO_ROLE[roleFilter];
      list = list.filter((p) => p.role === role);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q),
      );
    }
    return list;
  }, [players, roleFilter, search]);

  const addPlayer = useCallback(
    (p: PlayerData) => {
      if (selected.length >= teamSize || selectedIds.has(p.id) || isLocked)
        return;
      setSelected((prev) => [...prev, p]);
      setError(null);
      setSaved(false);
    },
    [selected.length, selectedIds, teamSize, isLocked],
  );

  const removePlayer = useCallback(
    (id: number) => {
      if (isLocked) return;
      setSelected((prev) => prev.filter((p) => p.id !== id));
      setError(null);
      setSaved(false);
    },
    [isLocked],
  );

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated || !token || selected.length !== teamSize || !matchId)
      return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/selected-teams", {
        method: "POST",
        json: { matchId, playerIds: selected.map((p) => p.id) },
        token,
      });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        if (err.code === "MATCH_LOCKED") {
          setMatchStatus("live");
        }
      } else {
        setError("Failed to save squad");
      }
    } finally {
      setSubmitting(false);
    }
  }, [isAuthenticated, token, selected, teamSize, matchId]);

  const handlePlayMatch = useCallback(async () => {
    if (!matchId || playing) return;
    setPlaying(true);
    setError(null);
    try {
      await apiFetch(`/api/matches/${matchId}/play`, {
        method: "POST",
        json: {},
        token,
      });
      // Hard navigate so the RSC re-renders into the scorecard view
      // and client state (including the spinning button) fully resets.
      window.location.href = `/play?matchId=${matchId}`;
    } catch (err) {
      const msg =
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Failed to simulate match";
      // If the match was already completed on the server (e.g., a
      // previous click that hit the DB but lost its response), just
      // navigate to the scorecard view instead of showing an error.
      if (msg.toLowerCase().includes("already completed")) {
        window.location.href = `/play?matchId=${matchId}`;
        return;
      }
      setError(msg);
      setPlaying(false);
    }
  }, [matchId, playing, token]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Icon name="lock" className="text-5xl text-on-surface-variant/40" />
        <h2 className="font-headline text-2xl font-bold text-on-surface">
          Connect Your Wallet
        </h2>
        <p className="max-w-md text-on-surface-variant">
          Link your wallet on the landing page to start drafting your fantasy
          squad.
        </p>
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Icon
          name="calendar_month"
          className="text-5xl text-on-surface-variant/40"
        />
        <h2 className="font-headline text-2xl font-bold text-on-surface">
          No Match Found
        </h2>
        <p className="max-w-md text-on-surface-variant">
          There are no upcoming or active matches right now.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-outline-variant/20 px-5 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Icon className="text-base" name="arrow_back" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Match header with status badge */}
      <div className="border-b border-outline-variant/20 bg-surface-container px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Icon name="arrow_back" className="text-base" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-surface-container-high px-3 py-1.5 font-headline text-sm font-bold text-on-surface">
              {currentMatch.teamA}
            </span>
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              vs
            </span>
            <span className="rounded-lg bg-surface-container-high px-3 py-1.5 font-headline text-sm font-bold text-on-surface">
              {currentMatch.teamB}
            </span>
          </div>

          {currentMatch.venue && (
            <span className="hidden text-xs text-on-surface-variant md:inline">
              {currentMatch.venue}
            </span>
          )}

          <span className="hidden text-xs text-on-surface-variant md:inline">
            {formatMatchDate(currentMatch.scheduledAt)}
          </span>

          {isLocked ? (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1 text-xs font-bold uppercase text-error">
              <Icon name="lock" className="text-xs" />
              {matchStatus === "live" ? "Live — Locked" : "Completed — Locked"}
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              <Icon name="edit" className="text-xs" />
              Open for Selection
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Left: player pool */}
        <div className="flex-1">
          <div className="relative mb-4">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50"
            />
            <input
              type="text"
              placeholder="Search players or teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLocked}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container py-3 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="mb-5 flex gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRoleFilter(tab)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  roleFilter === tab
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-on-surface-variant">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`group flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-outline-variant/20 bg-surface-container hover:border-primary/20"
                    } ${isLocked ? "opacity-70" : ""}`}
                  >
                    {p.photoUrl ? (
                      <Image
                        src={p.photoUrl}
                        alt={p.name}
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-lg font-bold text-on-surface-variant">
                        {p.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                        {ROLE_DISPLAY[p.role] ?? p.role}
                      </div>
                      <div className="truncate font-headline text-sm font-bold text-on-surface">
                        {p.name}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {p.team}
                      </div>
                    </div>
                    {isLocked ? (
                      isSelected ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Icon
                            name="check"
                            className="text-base text-primary"
                          />
                        </span>
                      ) : null
                    ) : isSelected ? (
                      <button
                        type="button"
                        onClick={() => removePlayer(p.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/10 transition-colors hover:bg-error/20"
                      >
                        <Icon
                          name="remove"
                          className="text-base text-error"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addPlayer(p)}
                        disabled={selected.length >= teamSize}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors hover:bg-primary/20 disabled:opacity-30"
                      >
                        <Icon
                          name="add"
                          className="text-base text-primary"
                        />
                      </button>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-on-surface-variant">
                  No players match your search.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: selection panel */}
        <aside className="w-full shrink-0 lg:w-[300px]">
          <div className="sticky top-6 rounded-2xl border border-outline-variant/20 bg-surface-container p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-headline text-lg font-bold text-on-surface">
                Your Squad
              </h2>
              <span className="font-headline text-sm font-bold text-primary">
                {selected.length}/{teamSize}
              </span>
            </div>

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(selected.length / teamSize) * 100}%`,
                }}
              />
            </div>

            <div className="mb-5 flex flex-col gap-2">
              {selected.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-container-high/60 px-3 py-2"
                >
                  {p.photoUrl ? (
                    <Image
                      src={p.photoUrl}
                      alt={p.name}
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {ROLE_LABELS[p.role] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-on-surface">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-on-surface-variant">
                      {p.team}
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="text-on-surface-variant/50 transition-colors hover:text-error"
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  )}
                </div>
              ))}
              {selected.length === 0 && !isLocked && (
                <p className="py-4 text-center text-xs text-on-surface-variant/50">
                  Pick {teamSize} players to build your squad
                </p>
              )}
              {selected.length === 0 && isLocked && (
                <p className="py-4 text-center text-xs text-on-surface-variant/50">
                  No squad was selected for this match
                </p>
              )}
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">
                {error}
              </p>
            )}

            {isLocked ? (
              <div className="rounded-xl bg-error/10 px-4 py-3 text-center text-sm font-bold text-error">
                <Icon
                  name="lock"
                  className="mr-1 align-middle text-base"
                />
                Squad Locked
              </div>
            ) : saved ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl bg-primary/10 px-4 py-3 text-center text-sm font-bold text-primary">
                  <Icon
                    name="check_circle"
                    className="mr-1 align-middle text-base"
                  />
                  Squad Saved
                </div>
                <button
                  type="button"
                  onClick={handlePlayMatch}
                  disabled={playing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 font-headline text-sm font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Icon
                    name={playing ? "autorenew" : "play_arrow"}
                    className={`text-lg ${playing ? "animate-spin" : ""}`}
                  />
                  {playing ? "Simulating Match..." : "Play Match (Demo)"}
                </button>
                <p className="text-center text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                  Demo mode · simulates stats & scores your squad
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  selected.length !== teamSize ||
                  submitting ||
                  !isAuthenticated
                }
                className="w-full rounded-xl bg-primary py-3 font-headline text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {submitting
                  ? "Saving..."
                  : selected.length === teamSize
                    ? "Confirm Squad"
                    : `Select ${teamSize - selected.length} more`}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
