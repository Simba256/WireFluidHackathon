"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TEAM_SIZE } from "@boundaryline/shared";
import { apiFetch } from "@/lib/api-client";
import { fetchers, queryKeys } from "@/lib/queries";
import { useAuth } from "@/components/auth-provider";
import { TeamPickerClient } from "./team-picker-client";
import { MatchScorecardClient } from "./match-scorecard-client";

interface Props {
  matchId: number | null;
}

export function PlayDispatch({ matchId }: Props) {
  const { address, token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.playCurrent(matchId),
    queryFn: () => fetchers.playCurrent(matchId),
  });

  // Chain-prefetch the child component's data as soon as the match is
  // known. By the time TeamPickerClient / MatchScorecardClient mount,
  // their useQuery finds a warm cache and renders instantly.
  useEffect(() => {
    const match = query.data?.match;
    if (!match || !isAuthenticated || !address || !token) return;
    if (match.status === "scheduled") {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.selectedTeam(match.id, address),
        queryFn: () => fetchers.selectedTeam(match.id, token),
      });
    } else {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.matchScorecard(match.id, address),
        queryFn: () =>
          apiFetch(`/api/matches/${match.id}/scorecard`, { token }),
      });
    }
  }, [query.data, isAuthenticated, address, token, queryClient]);

  if (query.isLoading && !query.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-3xl border border-white/5 bg-surface-container-low" />
      </div>
    );
  }

  if (query.error instanceof Error && !query.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-error">{query.error.message}</p>
      </div>
    );
  }

  const match = query.data?.match ?? null;
  const players = query.data?.players ?? [];

  if (match && match.status !== "scheduled") {
    return <MatchScorecardClient matchId={match.id} />;
  }

  return (
    <TeamPickerClient
      players={players}
      currentMatch={match}
      teamSize={TEAM_SIZE}
    />
  );
}
