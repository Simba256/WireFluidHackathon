import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";

const walletCheck = (name: string) =>
  check(`${name}_lowercase_hex`, sql.raw(`${name} ~ '^0x[0-9a-f]{40}$'`));

export const user = pgTable(
  "user",
  {
    wallet: text("wallet").primaryKey(),
    username: text("username"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    walletCheck("wallet"),
    uniqueIndex("user_username_key").on(t.username),
  ],
);

export const siweNonce = pgTable(
  "siwe_nonce",
  {
    nonce: text("nonce").primaryKey(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [index("siwe_nonce_expires_at_idx").on(t.expiresAt)],
);

export const player = pgTable(
  "player",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    team: text("team").notNull(),
    role: text("role").notNull(),
    basePrice: integer("base_price").notNull(),
    photoUrl: text("photo_url"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("player_external_id_key").on(t.externalId),
    index("player_team_idx").on(t.team),
    index("player_role_idx").on(t.role),
  ],
);

export const match = pgTable(
  "match",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull(),
    teamA: text("team_a").notNull(),
    teamB: text("team_b").notNull(),
    venue: text("venue"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    playedAt: timestamp("played_at", { withTimezone: true }),
    teamAScore: text("team_a_score"),
    teamBScore: text("team_b_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("match_tournament_status_idx").on(t.tournamentId, t.status)],
);

export const playerScore = pgTable(
  "player_score",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => match.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => player.id),
    runs: integer("runs").default(0).notNull(),
    wickets: integer("wickets").default(0).notNull(),
    catches: integer("catches").default(0).notNull(),
    runOuts: integer("run_outs").default(0).notNull(),
    stumpings: integer("stumpings").default(0).notNull(),
    dismissedForZero: boolean("dismissed_for_zero").default(false).notNull(),
    pointsAwarded: bigint("points_awarded", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("player_score_match_player_key").on(t.matchId, t.playerId),
    index("player_score_player_idx").on(t.playerId),
  ],
);

export const team = pgTable(
  "team",
  {
    id: serial("id").primaryKey(),
    userWallet: text("user_wallet")
      .notNull()
      .references(() => user.wallet),
    tournamentId: integer("tournament_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("team_user_tournament_key").on(t.userWallet, t.tournamentId),
    walletCheck("user_wallet"),
  ],
);

export const teamPlayer = pgTable(
  "team_player",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => team.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => player.id),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.playerId] }),
    index("team_player_player_idx").on(t.playerId),
  ],
);

export const userPoint = pgTable(
  "user_point",
  {
    wallet: text("wallet").notNull(),
    tournamentId: integer("tournament_id").notNull(),
    totalPoints: bigint("total_points", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    lastMatchId: integer("last_match_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.wallet, t.tournamentId] }),
    index("user_point_leaderboard_idx").on(
      t.tournamentId,
      t.totalPoints.desc(),
    ),
    walletCheck("wallet"),
  ],
);

export const syncedRecord = pgTable(
  "synced_record",
  {
    id: serial("id").primaryKey(),
    wallet: text("wallet").notNull(),
    tournamentId: integer("tournament_id").notNull(),
    amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
    nonce: numeric("nonce", { precision: 78, scale: 0 }).notNull(),
    txHash: text("tx_hash"),
    blockNumber: bigint("block_number", { mode: "bigint" }),
    status: text("status").notNull(),
    voucherExpiresAt: timestamp("voucher_expires_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("synced_record_nonce_key").on(t.nonce),
    index("synced_record_wallet_tournament_idx").on(t.wallet, t.tournamentId),
    walletCheck("wallet"),
  ],
);

export const claim = pgTable(
  "claim",
  {
    id: serial("id").primaryKey(),
    wallet: text("wallet").notNull(),
    tournamentId: integer("tournament_id").notNull(),
    tierId: smallint("tier_id").notNull(),
    nonce: numeric("nonce", { precision: 78, scale: 0 }).notNull(),
    txHash: text("tx_hash"),
    blockNumber: bigint("block_number", { mode: "bigint" }),
    status: text("status").notNull(),
    voucherExpiresAt: timestamp("voucher_expires_at", {
      withTimezone: true,
    }).notNull(),
    trophyTokenId: bigint("trophy_token_id", { mode: "bigint" }),
    earnedAtClaim: numeric("earned_at_claim", { precision: 78, scale: 0 }),
    fulfillmentStatus: text("fulfillment_status").default("none").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("claim_nonce_key").on(t.nonce),
    uniqueIndex("claim_active_wallet_tournament_key")
      .on(t.wallet, t.tournamentId)
      .where(sql`status IN ('pending', 'confirmed')`),
    index("claim_tier_status_idx").on(t.tierId, t.status),
    walletCheck("wallet"),
  ],
);

export const prize = pgTable(
  "prize",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull(),
    tierId: smallint("tier_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    stockLimit: integer("stock_limit").notNull(),
    rankRequired: integer("rank_required").notNull(),
  },
  (t) => [
    uniqueIndex("prize_tournament_tier_key").on(t.tournamentId, t.tierId),
  ],
);

export const prizeLeaderboardSnapshot = pgTable(
  "prize_leaderboard_snapshot",
  {
    wallet: text("wallet").notNull(),
    tournamentId: integer("tournament_id").notNull(),
    earnedBalance: numeric("earned_balance", {
      precision: 78,
      scale: 0,
    }).notNull(),
    rank: integer("rank").notNull(),
    snapshotBlock: bigint("snapshot_block", { mode: "bigint" }).notNull(),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.wallet, t.tournamentId] }),
    index("prize_leaderboard_rank_idx").on(t.tournamentId, t.rank),
    walletCheck("wallet"),
  ],
);

export const tournament = pgTable("tournament", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  graceEnds: timestamp("grace_ends", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminSession = pgTable("admin_session", {
  token: text("token").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type User = typeof user.$inferSelect;
export type SiweNonce = typeof siweNonce.$inferSelect;
export type Player = typeof player.$inferSelect;
export type Match = typeof match.$inferSelect;
export type PlayerScore = typeof playerScore.$inferSelect;
export type Team = typeof team.$inferSelect;
export type TeamPlayer = typeof teamPlayer.$inferSelect;
export type UserPoint = typeof userPoint.$inferSelect;
export type SyncedRecord = typeof syncedRecord.$inferSelect;
export type Claim = typeof claim.$inferSelect;
export type Prize = typeof prize.$inferSelect;
export type PrizeLeaderboardSnapshot =
  typeof prizeLeaderboardSnapshot.$inferSelect;
export type Tournament = typeof tournament.$inferSelect;
export type AdminSession = typeof adminSession.$inferSelect;
