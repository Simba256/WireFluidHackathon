import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Role = 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper';

interface PlayerSeed {
  externalId: string;
  name: string;
  team: string;
  role: Role;
  basePrice: number;
}

const FRANCHISES = [
  'Islamabad United',
  'Karachi Kings',
  'Lahore Qalandars',
  'Multan Sultans',
  'Peshawar Zalmi',
  'Quetta Gladiators',
] as const;

// Marquee players per franchise — real PSL names, hand-priced
const MARQUEE: Record<(typeof FRANCHISES)[number], Array<Omit<PlayerSeed, 'externalId'>>> = {
  'Islamabad United': [
    { name: 'Shadab Khan', team: 'Islamabad United', role: 'all-rounder', basePrice: 13 },
    { name: 'Colin Munro', team: 'Islamabad United', role: 'batsman', basePrice: 12 },
    { name: 'Azam Khan', team: 'Islamabad United', role: 'wicketkeeper', basePrice: 11 },
    { name: 'Naseem Shah', team: 'Islamabad United', role: 'bowler', basePrice: 13 },
    { name: 'Imad Wasim', team: 'Islamabad United', role: 'all-rounder', basePrice: 11 },
    { name: 'Matthew Short', team: 'Islamabad United', role: 'batsman', basePrice: 10 },
    { name: 'Rumman Raees', team: 'Islamabad United', role: 'bowler', basePrice: 9 },
    { name: 'Haider Ali', team: 'Islamabad United', role: 'batsman', basePrice: 9 },
  ],
  'Karachi Kings': [
    { name: 'Shan Masood', team: 'Karachi Kings', role: 'batsman', basePrice: 12 },
    { name: 'Kane Williamson', team: 'Karachi Kings', role: 'batsman', basePrice: 14 },
    { name: 'Mohammad Amir', team: 'Karachi Kings', role: 'bowler', basePrice: 12 },
    { name: 'Hasan Ali', team: 'Karachi Kings', role: 'bowler', basePrice: 11 },
    { name: 'James Vince', team: 'Karachi Kings', role: 'batsman', basePrice: 11 },
    { name: 'Irfan Khan', team: 'Karachi Kings', role: 'all-rounder', basePrice: 9 },
    { name: 'Arafat Minhas', team: 'Karachi Kings', role: 'all-rounder', basePrice: 8 },
    { name: 'Tim Seifert', team: 'Karachi Kings', role: 'wicketkeeper', basePrice: 10 },
  ],
  'Lahore Qalandars': [
    { name: 'Shaheen Shah Afridi', team: 'Lahore Qalandars', role: 'bowler', basePrice: 14 },
    { name: 'Fakhar Zaman', team: 'Lahore Qalandars', role: 'batsman', basePrice: 13 },
    { name: 'Rashid Khan', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 15 },
    { name: 'Sikandar Raza', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 12 },
    { name: 'David Wiese', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 10 },
    { name: 'Mohammad Hafeez', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 9 },
    { name: 'Haris Rauf', team: 'Lahore Qalandars', role: 'bowler', basePrice: 13 },
    { name: 'Abdullah Shafique', team: 'Lahore Qalandars', role: 'batsman', basePrice: 10 },
  ],
  'Multan Sultans': [
    { name: 'Mohammad Rizwan', team: 'Multan Sultans', role: 'wicketkeeper', basePrice: 15 },
    { name: 'Iftikhar Ahmed', team: 'Multan Sultans', role: 'batsman', basePrice: 11 },
    { name: 'Mohammad Nawaz', team: 'Multan Sultans', role: 'all-rounder', basePrice: 10 },
    { name: 'Usama Mir', team: 'Multan Sultans', role: 'bowler', basePrice: 9 },
    { name: 'Reeza Hendricks', team: 'Multan Sultans', role: 'batsman', basePrice: 10 },
    { name: 'Chris Jordan', team: 'Multan Sultans', role: 'bowler', basePrice: 11 },
    { name: 'Tayyab Tahir', team: 'Multan Sultans', role: 'batsman', basePrice: 8 },
    { name: 'Abbas Afridi', team: 'Multan Sultans', role: 'bowler', basePrice: 9 },
  ],
  'Peshawar Zalmi': [
    { name: 'Babar Azam', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 15 },
    { name: 'Saim Ayub', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 11 },
    { name: 'Mehran Mumtaz', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 8 },
    { name: 'Luke Wood', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 10 },
    { name: 'Daniel Sams', team: 'Peshawar Zalmi', role: 'all-rounder', basePrice: 10 },
    { name: 'Sufiyan Muqeem', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 9 },
    { name: 'Paul Walter', team: 'Peshawar Zalmi', role: 'all-rounder', basePrice: 8 },
    { name: 'Mohammad Haris', team: 'Peshawar Zalmi', role: 'wicketkeeper', basePrice: 10 },
  ],
  'Quetta Gladiators': [
    { name: 'Saud Shakeel', team: 'Quetta Gladiators', role: 'batsman', basePrice: 11 },
    { name: 'Rilee Rossouw', team: 'Quetta Gladiators', role: 'batsman', basePrice: 12 },
    { name: 'Mohammad Wasim Jr', team: 'Quetta Gladiators', role: 'bowler', basePrice: 11 },
    { name: 'Akeal Hosein', team: 'Quetta Gladiators', role: 'all-rounder', basePrice: 9 },
    { name: 'Omair Bin Yousuf', team: 'Quetta Gladiators', role: 'batsman', basePrice: 8 },
    { name: 'Khurram Shahzad', team: 'Quetta Gladiators', role: 'bowler', basePrice: 9 },
    { name: 'Sherfane Rutherford', team: 'Quetta Gladiators', role: 'all-rounder', basePrice: 10 },
    { name: 'Usman Tariq', team: 'Quetta Gladiators', role: 'bowler', basePrice: 8 },
  ],
};

const ROLE_CYCLE: Role[] = ['batsman', 'bowler', 'all-rounder', 'wicketkeeper', 'bowler', 'batsman'];

function pricebyRole(role: Role, tier: 'mid' | 'bench'): number {
  const midPrices: Record<Role, number> = { batsman: 8, bowler: 8, 'all-rounder': 7, wicketkeeper: 7 };
  const benchPrices: Record<Role, number> = { batsman: 6, bowler: 6, 'all-rounder': 5, wicketkeeper: 5 };
  return tier === 'mid' ? midPrices[role] : benchPrices[role];
}

const players: PlayerSeed[] = [];
let counter = 0;

for (const franchise of FRANCHISES) {
  // marquee
  for (const m of MARQUEE[franchise]) {
    counter++;
    players.push({
      externalId: `psl2026-${counter.toString().padStart(4, '0')}`,
      ...m,
    });
  }
  // mid-tier squad (8 per franchise)
  for (let i = 1; i <= 8; i++) {
    counter++;
    const role = ROLE_CYCLE[i % ROLE_CYCLE.length]!;
    players.push({
      externalId: `psl2026-${counter.toString().padStart(4, '0')}`,
      name: `${franchise.split(' ')[0]} Squad ${i}`,
      team: franchise,
      role,
      basePrice: pricebyRole(role, 'mid'),
    });
  }
  // bench (9 per franchise) → 25 per franchise → 150 total
  for (let i = 1; i <= 9; i++) {
    counter++;
    const role = ROLE_CYCLE[(i + 2) % ROLE_CYCLE.length]!;
    players.push({
      externalId: `psl2026-${counter.toString().padStart(4, '0')}`,
      name: `${franchise.split(' ')[0]} Reserve ${i}`,
      team: franchise,
      role,
      basePrice: pricebyRole(role, 'bench'),
    });
  }
}

const outPath = resolve(process.cwd(), 'data/psl-2026-players.json');
writeFileSync(outPath, JSON.stringify(players, null, 2) + '\n');
console.log(`Wrote ${players.length} players to ${outPath}`);
