import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../src/client";
import { getActiveTournamentId } from "../src/queries";
import { user, userPoint } from "../src/schema";

const ROOT = resolve(__dirname, "../../..");
const envPath = resolve(ROOT, ".env.local");
if (existsSync(envPath) && !process.env.DATABASE_URL) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]!]) {
      process.env[m[1]!] = m[2]!;
    }
  }
}

interface DemoUser {
  username: string;
  totalPoints: number;
}

const DEMO_USERS: DemoUser[] = [
  // Rank 1
  { username: "hamza_malik", totalPoints: 52_340 },

  // Top 3
  { username: "sarah_johnson", totalPoints: 45_120 },
  { username: "ali_ahmed", totalPoints: 38_750 },

  // Top 10 (ranks 4-10)
  { username: "jake_mitchell", totalPoints: 32_100 },
  { username: "ayesha_khan", totalPoints: 29_880 },
  { username: "tyler_brooks", totalPoints: 27_450 },
  { username: "usman_raza", totalPoints: 24_600 },
  { username: "emily_davis", totalPoints: 22_310 },
  { username: "bilal_shah", totalPoints: 20_170 },
  { username: "megan_clark", totalPoints: 18_520 },

  // Top 25 (ranks 11-25)
  { username: "fahad_hussain", totalPoints: 15_900 },
  { username: "jason_lee", totalPoints: 14_220 },
  { username: "zainab_noor", totalPoints: 13_100 },
  { username: "brandon_white", totalPoints: 12_450 },
  { username: "sana_tariq", totalPoints: 11_800 },
  { username: "chris_anderson", totalPoints: 10_920 },
  { username: "imran_ashraf", totalPoints: 9_750 },
  { username: "jessica_moore", totalPoints: 8_630 },
  { username: "rizwan_ali", totalPoints: 7_800 },
  { username: "david_thompson", totalPoints: 7_100 },
  { username: "hira_batool", totalPoints: 6_320 },
  { username: "matt_wilson", totalPoints: 5_600 },
  { username: "kamran_yousuf", totalPoints: 5_050 },
  { username: "ashley_taylor", totalPoints: 4_410 },
  { username: "nadia_pervez", totalPoints: 4_020 },
];

function makeWallet(index: number): string {
  const hex = index.toString(16).padStart(36, "0");
  return `0xdead${hex}`;
}

async function main() {
  const db = getDb();
  const tournamentId = await getActiveTournamentId(db);

  console.log(`Seeding ${DEMO_USERS.length} demo users for tournament ${tournamentId}…`);

  const userRows = DEMO_USERS.map((u, i) => ({
    wallet: makeWallet(i),
    username: u.username,
  }));

  const pointRows = DEMO_USERS.map((u, i) => ({
    wallet: makeWallet(i),
    tournamentId,
    totalPoints: BigInt(u.totalPoints),
  }));

  await db.insert(user).values(userRows).onConflictDoNothing();
  await db.insert(userPoint).values(pointRows).onConflictDoNothing();

  console.log(`Inserted ${DEMO_USERS.length} users + user_point rows.`);
  console.log("Top 3:");
  for (const u of DEMO_USERS.slice(0, 3)) {
    console.log(`  ${u.username}: ${u.totalPoints.toLocaleString()} pts`);
  }
  console.log(`Point range: ${DEMO_USERS.at(-1)!.totalPoints.toLocaleString()} – ${DEMO_USERS[0]!.totalPoints.toLocaleString()}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
