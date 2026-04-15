import { parseUnits } from "viem";

export const BNDY_DECIMALS = 18 as const;

export const APP_NAME = "BoundaryLine" as const;
export const DEFAULT_MANAGER_NAME = "Fantasy Manager" as const;
export const DASHBOARD_SEASON_LABEL = "Season 2026" as const;
export const DASHBOARD_TOURNAMENT_SUBTITLE =
  "PSL Edition - Pro League" as const;

export const TEAM_SIZE = 11 as const;

export const MIN_EARNED_TO_CLAIM_BNDY = 10_000 as const;
export const MIN_EARNED_TO_CLAIM_WEI: bigint = parseUnits(
  String(MIN_EARNED_TO_CLAIM_BNDY),
  BNDY_DECIMALS,
);

export const VOUCHER_TTL_SECONDS = 5 * 60;

export const POINT_FORMULA = {
  RUN: 1,
  WICKET: 25,
  CATCH: 10,
  RUN_OUT: 10,
  STUMPING: 10,
  HALF_CENTURY_BONUS: 20,
  HALF_CENTURY_THRESHOLD: 50,
  CENTURY_BONUS: 50,
  CENTURY_THRESHOLD: 100,
  FIVE_WICKET_BONUS: 50,
  FIVE_WICKET_THRESHOLD: 5,
  DUCK_PENALTY: 5,
} as const;

export interface FranchiseDefinition {
  name: string;
  shortCode: string;
  shortLabel: string;
  accentColor: string;
  logoPath: string;
}

export const FRANCHISES: readonly FranchiseDefinition[] = [
  {
    name: "Hyderabad Kingsmen",
    shortCode: "HHK",
    shortLabel: "Hyderabad",
    accentColor: "#c084fc",
    logoPath: "/team-logos/hyderabad-kingsmen.png",
  },
  {
    name: "Islamabad United",
    shortCode: "IU",
    shortLabel: "Islamabad",
    accentColor: "#ef4444",
    logoPath: "/team-logos/islamabad-united.png",
  },
  {
    name: "Karachi Kings",
    shortCode: "KK",
    shortLabel: "Karachi",
    accentColor: "#3b82f6",
    logoPath: "/team-logos/karachi-kings.png",
  },
  {
    name: "Lahore Qalandars",
    shortCode: "LQ",
    shortLabel: "Lahore",
    accentColor: "#22c55e",
    logoPath: "/team-logos/lahore-qalandars.png",
  },
  {
    name: "Multan Sultans",
    shortCode: "MS",
    shortLabel: "Multan",
    accentColor: "#a855f7",
    logoPath: "/team-logos/multan-sultans.png",
  },
  {
    name: "Peshawar Zalmi",
    shortCode: "PZ",
    shortLabel: "Peshawar",
    accentColor: "#f59e0b",
    logoPath: "/team-logos/peshawar-zalmi.png",
  },
  {
    name: "Quetta Gladiators",
    shortCode: "QG",
    shortLabel: "Quetta",
    accentColor: "#8b5cf6",
    logoPath: "/team-logos/quetta-gladiators.png",
  },
  {
    name: "Rawalpindiz",
    shortCode: "RWP",
    shortLabel: "Rawalpindi",
    accentColor: "#fb7185",
    logoPath: "/team-logos/rawalpindiz.png",
  },
] as const;

export const FRANCHISES_BY_NAME: Record<string, FranchiseDefinition> =
  FRANCHISES.reduce(
    (acc, franchise) => {
      acc[franchise.name] = franchise;
      return acc;
    },
    {} as Record<string, FranchiseDefinition>,
  );

export function franchiseForName(name: string): FranchiseDefinition {
  return (
    FRANCHISES_BY_NAME[name] ?? {
      name,
      shortCode: name
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      shortLabel: name,
      accentColor: "#54e98a",
      logoPath: "",
    }
  );
}

export const TIER = {
  RANK_1: 1,
  TOP_3: 2,
  TOP_10: 3,
  TOP_25: 4,
  TOP_50: 5,
} as const;

export type TierId = (typeof TIER)[keyof typeof TIER];

export type TierName = "TOP_50" | "TOP_25" | "TOP_10" | "TOP_3" | "RANK_1";

export interface TierDefinition {
  id: TierId;
  name: TierName;
  rankRequired: number;
  stockLimit: number;
  displayName: string;
}

export const TIERS: readonly TierDefinition[] = [
  {
    id: TIER.RANK_1,
    name: "RANK_1",
    rankRequired: 1,
    stockLimit: 1,
    displayName: "Rank 1",
  },
  {
    id: TIER.TOP_3,
    name: "TOP_3",
    rankRequired: 3,
    stockLimit: 3,
    displayName: "Top 3",
  },
  {
    id: TIER.TOP_10,
    name: "TOP_10",
    rankRequired: 10,
    stockLimit: 10,
    displayName: "Top 10",
  },
  {
    id: TIER.TOP_25,
    name: "TOP_25",
    rankRequired: 25,
    stockLimit: 25,
    displayName: "Top 25",
  },
  {
    id: TIER.TOP_50,
    name: "TOP_50",
    rankRequired: 50,
    stockLimit: 50,
    displayName: "Top 50",
  },
] as const;

export const TIERS_BY_ID: Record<TierId, TierDefinition> = TIERS.reduce(
  (acc, tier) => {
    acc[tier.id] = tier;
    return acc;
  },
  {} as Record<TierId, TierDefinition>,
);

export const tierForRank = (rank: number): TierDefinition | null => {
  if (rank < 1) return null;
  const ordered = [...TIERS].sort((a, b) => a.rankRequired - b.rankRequired);
  for (const tier of ordered) {
    if (rank <= tier.rankRequired) return tier;
  }
  return null;
};

export const EIP712_DOMAIN_NAME = "BoundaryLine" as const;
export const EIP712_DOMAIN_VERSION = "1" as const;

export const PLAYER_ROLES = ["batsman", "bowler", "all-rounder", "wicketkeeper"] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];
