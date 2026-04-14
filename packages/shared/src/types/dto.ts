import type { PlayerRole, TierId, TierName } from "../constants";

export interface UserDTO {
  wallet: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface PlayerDTO {
  id: number;
  name: string;
  team: string;
  role: PlayerRole;
  photoUrl: string | null;
}

export interface TeamDTO {
  id: number;
  wallet: string;
  tournamentId: number;
  playerIds: number[];
  createdAt: string;
}

export interface TeamWithPlayersDTO extends Omit<TeamDTO, "playerIds"> {
  players: PlayerDTO[];
}

export interface MatchDTO {
  id: number;
  tournamentId: number;
  teamA: string;
  teamB: string;
  venue: string | null;
  scheduledAt: string;
  status: "scheduled" | "live" | "completed";
  playedAt: string | null;
}

export interface PlayerScoreDTO {
  matchId: number;
  playerId: number;
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissedForZero: boolean;
  pointsAwarded: number;
}

export interface PointsSummaryDTO {
  wallet: string;
  totalEarned: number;
  onChainEarned: string;
  walletBalance: string;
  unsynced: number;
  globalRank: number | null;
  globalTotal: number;
  prizeRank: number | null;
  prizeTotal: number;
  currentTierBand: TierName | null;
  canClaim: boolean;
}

export interface LeaderboardEntryDTO {
  rank: number;
  wallet: string;
  username: string | null;
  totalPoints: number;
}

export interface PrizeLeaderboardEntryDTO {
  rank: number;
  wallet: string;
  earnedBalance: string;
  tierEligible: TierName | null;
}

export interface GlobalLeaderboardDTO {
  entries: LeaderboardEntryDTO[];
  totalPlayers: number;
  updatedAt: string;
}

export interface PrizeLeaderboardDTO {
  entries: PrizeLeaderboardEntryDTO[];
  totalSynced: number;
  snapshotBlock: number;
  updatedAt: string;
}

export interface PrizeDTO {
  tierId: TierId;
  name: TierName;
  displayName: string;
  rankRequired: number;
  stock: number;
  claimed: number;
  prize: {
    name: string;
    description: string;
    imageUrl: string | null;
  };
}

export interface ClaimStatusDTO {
  claim: {
    tierId: TierId;
    tierName: TierName;
    txHash: string;
    tokenId: number | null;
    claimedAt: string;
    fulfillmentStatus: "pending_shipping" | "shipped" | "delivered";
  } | null;
}

export interface TrophyDTO {
  tokenId: number;
  tierId: TierId;
  tierName: TierName;
  tournamentId: number;
  mintedAt: string | null;
  tokenUri: string;
}

export interface TrophiesResponseDTO {
  wallet: string;
  trophies: TrophyDTO[];
}

export interface DashboardMatchActivityDTO {
  id: number;
  status: "scheduled" | "live" | "completed";
  teamA: {
    name: string;
    shortCode: string;
    accentColor: string;
    logoPath: string;
  };
  teamB: {
    name: string;
    shortCode: string;
    accentColor: string;
    logoPath: string;
  };
  venue: string | null;
  scheduledAt: string;
  playedAt: string | null;
  points: number | null;
}

export interface DashboardDTO {
  user: {
    wallet: string;
    username: string;
    avatarUrl: string | null;
    shortWallet: string;
  };
  tournament: {
    id: number;
    name: string;
    seasonLabel: string;
    subtitle: string;
  };
  balances: {
    totalEarned: number;
    onChainEarned: string;
    walletBalance: string;
    unsynced: number;
    pendingSync: string;
    minEarnedToQualify: number;
  };
  team: {
    exists: boolean;
    playerCount: number;
  };
  global: {
    rank: number | null;
    totalPlayers: number;
    percentile: number | null;
  };
  prize: {
    qualified: boolean;
    prizeRank: number | null;
    prizeTotal: number;
    percentile: number | null;
    currentTier: {
      id: TierId;
      name: TierName;
      displayName: string;
      rankRequired: number;
    } | null;
    canClaim: boolean;
    progressLabel: string;
    progressPercent: number;
  };
  claim: {
    status: "pending" | "confirmed";
    tierId: TierId;
    tierName: TierName;
    tierDisplayName: string;
    txHash: string | null;
    tokenId: number | null;
    claimedAt: string;
    fulfillmentStatus: "none" | "pending_shipping" | "shipped" | "delivered";
  } | null;
  recentMatches: DashboardMatchActivityDTO[];
  upcomingMatches: DashboardMatchActivityDTO[];
}

export interface FixturesResponseDTO {
  fixtures: DashboardMatchActivityDTO[];
}
