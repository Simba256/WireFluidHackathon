import type { PlayerRole, TierId, TierName } from "../constants";

export interface UserDTO {
  wallet: string;
  displayName: string | null;
  createdAt: string;
}

export interface PlayerDTO {
  id: number;
  name: string;
  team: string;
  role: PlayerRole;
  basePrice: number;
  photoUrl: string | null;
}

export interface TeamDTO {
  id: number;
  wallet: string;
  tournamentId: number;
  playerIds: number[];
  totalCredits: number;
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
  displayName: string | null;
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
