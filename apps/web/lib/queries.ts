import type { QueryClient } from "@tanstack/react-query";
import type {
  DashboardChainStateDTO,
  DashboardGlobalDTO,
  DashboardSummaryDTO,
  TrophiesResponseDTO,
} from "@boundaryline/shared";
import { apiFetch } from "@/lib/api-client";

export const queryKeys = {
  walletBalance: (wallet: string) => ["wallet-balance", wallet] as const,
  dashboardMe: (wallet: string) => ["dashboard-me", wallet] as const,
  chainState: (wallet: string) => ["chain-state", wallet] as const,
  globalStanding: (wallet: string) => ["global-standing", wallet] as const,
  leaderboardGlobal: () => ["leaderboard-global"] as const,
  leaderboardPrize: () => ["leaderboard-prize"] as const,
  trophies: (wallet: string) => ["trophies", wallet] as const,
  prizeCatalog: () => ["prize-catalog"] as const,
  playCurrent: (matchId: number | null) =>
    ["play-current", matchId ?? "auto"] as const,
} as const;

export interface PlayCurrentResponse {
  match: {
    id: number;
    teamA: string;
    teamB: string;
    venue: string | null;
    scheduledAt: string;
    status: "live" | "scheduled" | "completed";
  } | null;
  players: Array<{
    id: number;
    name: string;
    team: string;
    role: string;
    photoUrl: string | null;
  }>;
}

export interface PrizeCatalogResponse {
  tiers: Array<{
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
  }>;
}

interface AuthedOpts {
  token: string;
}

export const fetchers = {
  walletBalance: ({ token }: AuthedOpts) =>
    apiFetch<{ walletBalance: string }>("/api/dashboard/wallet-balance", {
      token,
    }),
  dashboardMe: ({ token }: AuthedOpts) =>
    apiFetch<DashboardSummaryDTO>("/api/dashboard/me", { token }),
  chainState: ({ token }: AuthedOpts) =>
    apiFetch<DashboardChainStateDTO>("/api/dashboard/chain-state", { token }),
  globalStanding: ({ token }: AuthedOpts) =>
    apiFetch<DashboardGlobalDTO>("/api/dashboard/global-standing", { token }),
  leaderboardGlobal: () =>
    apiFetch<{
      entries: Array<{
        rank: number;
        wallet: string;
        username: string | null;
        avatarUrl: string | null;
        totalPoints: number;
      }>;
      totalPlayers: number;
      updatedAt: string;
    }>("/api/leaderboard/global?limit=100"),
  leaderboardPrize: () =>
    apiFetch<{
      entries: Array<{
        rank: number;
        wallet: string;
        username: string | null;
        avatarUrl: string | null;
        walletBalance: string;
        earnedBalance: string;
        tierEligible: string | null;
        canClaim: boolean;
      }>;
      totalQualified: number;
      snapshotBlock: number;
      updatedAt: string;
    }>("/api/leaderboard/prize?limit=100"),
  trophies: (wallet: string) =>
    apiFetch<TrophiesResponseDTO>(`/api/trophies/${wallet}`),
  prizeCatalog: () => apiFetch<PrizeCatalogResponse>("/api/prizes"),
  playCurrent: (matchId: number | null) =>
    apiFetch<PlayCurrentResponse>(
      matchId != null ? `/api/play/current?matchId=${matchId}` : "/api/play/current",
    ),
} as const;

export interface PrefetchContext {
  wallet: string;
  token: string;
}

export async function prefetchPublic(client: QueryClient): Promise<void> {
  await Promise.all([
    client.prefetchQuery({
      queryKey: queryKeys.leaderboardGlobal(),
      queryFn: fetchers.leaderboardGlobal,
    }),
    client.prefetchQuery({
      queryKey: queryKeys.leaderboardPrize(),
      queryFn: fetchers.leaderboardPrize,
    }),
    client.prefetchQuery({
      queryKey: queryKeys.prizeCatalog(),
      queryFn: fetchers.prizeCatalog,
    }),
    client.prefetchQuery({
      queryKey: queryKeys.playCurrent(null),
      queryFn: () => fetchers.playCurrent(null),
    }),
  ]);
}

export async function prefetchAuthenticated(
  client: QueryClient,
  { wallet, token }: PrefetchContext,
): Promise<void> {
  await Promise.all([
    prefetchPublic(client),
    client.prefetchQuery({
      queryKey: queryKeys.walletBalance(wallet),
      queryFn: () => fetchers.walletBalance({ token }),
    }),
    client.prefetchQuery({
      queryKey: queryKeys.dashboardMe(wallet),
      queryFn: () => fetchers.dashboardMe({ token }),
    }),
    client.prefetchQuery({
      queryKey: queryKeys.chainState(wallet),
      queryFn: () => fetchers.chainState({ token }),
    }),
    client.prefetchQuery({
      queryKey: queryKeys.globalStanding(wallet),
      queryFn: () => fetchers.globalStanding({ token }),
    }),
    client.prefetchQuery({
      queryKey: queryKeys.trophies(wallet),
      queryFn: () => fetchers.trophies(wallet),
    }),
  ]);
}

export function invalidateUserQueries(
  client: QueryClient,
  wallet: string,
): void {
  client.invalidateQueries({ queryKey: queryKeys.walletBalance(wallet) });
  client.invalidateQueries({ queryKey: queryKeys.dashboardMe(wallet) });
  client.invalidateQueries({ queryKey: queryKeys.chainState(wallet) });
  client.invalidateQueries({ queryKey: queryKeys.globalStanding(wallet) });
  client.invalidateQueries({ queryKey: queryKeys.leaderboardPrize() });
  client.invalidateQueries({ queryKey: queryKeys.trophies(wallet) });
}
