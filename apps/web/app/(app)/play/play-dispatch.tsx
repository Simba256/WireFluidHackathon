"use client";

import { useQuery } from "@tanstack/react-query";
import { TEAM_SIZE } from "@boundaryline/shared";
import { fetchers, queryKeys } from "@/lib/queries";
import { TeamPickerClient } from "./team-picker-client";
import { MatchScorecardClient } from "./match-scorecard-client";

interface Props {
  matchId: number | null;
}

export function PlayDispatch({ matchId }: Props) {
  const query = useQuery({
    queryKey: queryKeys.playCurrent(matchId),
    queryFn: () => fetchers.playCurrent(matchId),
  });

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
