import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Role = "batsman" | "bowler" | "all-rounder" | "wicketkeeper";

interface PlayerSeed {
  externalId: string;
  name: string;
  team: string;
  role: Role;
}

const FRANCHISES = [
  "Islamabad United",
  "Karachi Kings",
  "Lahore Qalandars",
  "Multan Sultans",
  "Peshawar Zalmi",
  "Quetta Gladiators",
] as const;

// Marquee players per franchise — real PSL names.
const MARQUEE: Record<
  (typeof FRANCHISES)[number],
  Array<Omit<PlayerSeed, "externalId">>
> = {
  "Islamabad United": [
    { name: "Shadab Khan", team: "Islamabad United", role: "all-rounder" },
    { name: "Colin Munro", team: "Islamabad United", role: "batsman" },
    { name: "Azam Khan", team: "Islamabad United", role: "wicketkeeper" },
    { name: "Naseem Shah", team: "Islamabad United", role: "bowler" },
    { name: "Imad Wasim", team: "Islamabad United", role: "all-rounder" },
    { name: "Matthew Short", team: "Islamabad United", role: "batsman" },
    { name: "Rumman Raees", team: "Islamabad United", role: "bowler" },
    { name: "Haider Ali", team: "Islamabad United", role: "batsman" },
  ],
  "Karachi Kings": [
    { name: "Shan Masood", team: "Karachi Kings", role: "batsman" },
    { name: "Kane Williamson", team: "Karachi Kings", role: "batsman" },
    { name: "Mohammad Amir", team: "Karachi Kings", role: "bowler" },
    { name: "Hasan Ali", team: "Karachi Kings", role: "bowler" },
    { name: "James Vince", team: "Karachi Kings", role: "batsman" },
    { name: "Irfan Khan", team: "Karachi Kings", role: "all-rounder" },
    { name: "Arafat Minhas", team: "Karachi Kings", role: "all-rounder" },
    { name: "Tim Seifert", team: "Karachi Kings", role: "wicketkeeper" },
  ],
  "Lahore Qalandars": [
    { name: "Shaheen Shah Afridi", team: "Lahore Qalandars", role: "bowler" },
    { name: "Fakhar Zaman", team: "Lahore Qalandars", role: "batsman" },
    { name: "Rashid Khan", team: "Lahore Qalandars", role: "all-rounder" },
    { name: "Sikandar Raza", team: "Lahore Qalandars", role: "all-rounder" },
    { name: "David Wiese", team: "Lahore Qalandars", role: "all-rounder" },
    { name: "Mohammad Hafeez", team: "Lahore Qalandars", role: "all-rounder" },
    { name: "Haris Rauf", team: "Lahore Qalandars", role: "bowler" },
    { name: "Abdullah Shafique", team: "Lahore Qalandars", role: "batsman" },
  ],
  "Multan Sultans": [
    { name: "Mohammad Rizwan", team: "Multan Sultans", role: "wicketkeeper" },
    { name: "Iftikhar Ahmed", team: "Multan Sultans", role: "batsman" },
    { name: "Mohammad Nawaz", team: "Multan Sultans", role: "all-rounder" },
    { name: "Usama Mir", team: "Multan Sultans", role: "bowler" },
    { name: "Reeza Hendricks", team: "Multan Sultans", role: "batsman" },
    { name: "Chris Jordan", team: "Multan Sultans", role: "bowler" },
    { name: "Tayyab Tahir", team: "Multan Sultans", role: "batsman" },
    { name: "Abbas Afridi", team: "Multan Sultans", role: "bowler" },
  ],
  "Peshawar Zalmi": [
    { name: "Babar Azam", team: "Peshawar Zalmi", role: "batsman" },
    { name: "Saim Ayub", team: "Peshawar Zalmi", role: "batsman" },
    { name: "Mehran Mumtaz", team: "Peshawar Zalmi", role: "bowler" },
    { name: "Luke Wood", team: "Peshawar Zalmi", role: "bowler" },
    { name: "Daniel Sams", team: "Peshawar Zalmi", role: "all-rounder" },
    { name: "Sufiyan Muqeem", team: "Peshawar Zalmi", role: "bowler" },
    { name: "Paul Walter", team: "Peshawar Zalmi", role: "all-rounder" },
    { name: "Mohammad Haris", team: "Peshawar Zalmi", role: "wicketkeeper" },
  ],
  "Quetta Gladiators": [
    { name: "Saud Shakeel", team: "Quetta Gladiators", role: "batsman" },
    { name: "Rilee Rossouw", team: "Quetta Gladiators", role: "batsman" },
    { name: "Mohammad Wasim Jr", team: "Quetta Gladiators", role: "bowler" },
    { name: "Akeal Hosein", team: "Quetta Gladiators", role: "all-rounder" },
    { name: "Omair Bin Yousuf", team: "Quetta Gladiators", role: "batsman" },
    { name: "Khurram Shahzad", team: "Quetta Gladiators", role: "bowler" },
    {
      name: "Sherfane Rutherford",
      team: "Quetta Gladiators",
      role: "all-rounder",
    },
    { name: "Usman Tariq", team: "Quetta Gladiators", role: "bowler" },
  ],
};

const ROLE_CYCLE: Role[] = [
  "batsman",
  "bowler",
  "all-rounder",
  "wicketkeeper",
  "bowler",
  "batsman",
];

const players: PlayerSeed[] = [];
let counter = 0;

for (const franchise of FRANCHISES) {
  // marquee
  for (const m of MARQUEE[franchise]) {
    counter++;
    players.push({
      externalId: `psl2026-${counter.toString().padStart(4, "0")}`,
      ...m,
    });
  }
  // mid-tier squad (8 per franchise)
  for (let i = 1; i <= 8; i++) {
    counter++;
    const role = ROLE_CYCLE[i % ROLE_CYCLE.length]!;
    players.push({
      externalId: `psl2026-${counter.toString().padStart(4, "0")}`,
      name: `${franchise.split(" ")[0]} Squad ${i}`,
      team: franchise,
      role,
    });
  }
  // bench (9 per franchise) → 25 per franchise → 150 total
  for (let i = 1; i <= 9; i++) {
    counter++;
    const role = ROLE_CYCLE[(i + 2) % ROLE_CYCLE.length]!;
    players.push({
      externalId: `psl2026-${counter.toString().padStart(4, "0")}`,
      name: `${franchise.split(" ")[0]} Reserve ${i}`,
      team: franchise,
      role,
    });
  }
}

const outPath = resolve(__dirname, "../../../data/psl-2026-players.json");
writeFileSync(outPath, JSON.stringify(players, null, 2) + "\n");
console.log(`Wrote ${players.length} players to ${outPath}`);
