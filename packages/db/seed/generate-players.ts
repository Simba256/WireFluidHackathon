import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type Role = "batsman" | "bowler" | "all-rounder" | "wicketkeeper";

interface PlayerSeed {
  externalId: string;
  name: string;
  team: string;
  role: Role;
  basePrice: number;
  photoUrl: string | null;
}

const SQUADS: Record<string, Array<Omit<PlayerSeed, 'externalId' | 'photoUrl'>>> = {
  'Islamabad United': [
    // WK (2)
    { name: 'Azam Khan', team: 'Islamabad United', role: 'wicketkeeper', basePrice: 11 },
    { name: 'Rahmanullah Gurbaz', team: 'Islamabad United', role: 'wicketkeeper', basePrice: 9 },
    // BAT (5)
    { name: 'Colin Munro', team: 'Islamabad United', role: 'batsman', basePrice: 12 },
    { name: 'Alex Hales', team: 'Islamabad United', role: 'batsman', basePrice: 11 },
    { name: 'Matthew Short', team: 'Islamabad United', role: 'batsman', basePrice: 10 },
    { name: 'Haider Ali', team: 'Islamabad United', role: 'batsman', basePrice: 9 },
    { name: 'Asif Ali', team: 'Islamabad United', role: 'batsman', basePrice: 8 },
    // AR (4)
    { name: 'Shadab Khan', team: 'Islamabad United', role: 'all-rounder', basePrice: 13 },
    { name: 'Imad Wasim', team: 'Islamabad United', role: 'all-rounder', basePrice: 11 },
    { name: 'Faheem Ashraf', team: 'Islamabad United', role: 'all-rounder', basePrice: 10 },
    { name: 'Mubasir Khan', team: 'Islamabad United', role: 'all-rounder', basePrice: 7 },
    // BOWL (5)
    { name: 'Naseem Shah', team: 'Islamabad United', role: 'bowler', basePrice: 13 },
    { name: 'Marchant de Lange', team: 'Islamabad United', role: 'bowler', basePrice: 10 },
    { name: 'Rumman Raees', team: 'Islamabad United', role: 'bowler', basePrice: 9 },
    { name: 'Zaman Khan', team: 'Islamabad United', role: 'bowler', basePrice: 8 },
    { name: 'Hunain Shah', team: 'Islamabad United', role: 'bowler', basePrice: 7 },
  ],

  'Karachi Kings': [
    // WK (2)
    { name: 'Tim Seifert', team: 'Karachi Kings', role: 'wicketkeeper', basePrice: 10 },
    { name: 'Sarfaraz Ahmed', team: 'Karachi Kings', role: 'wicketkeeper', basePrice: 8 },
    // BAT (5)
    { name: 'Kane Williamson', team: 'Karachi Kings', role: 'batsman', basePrice: 14 },
    { name: 'Shan Masood', team: 'Karachi Kings', role: 'batsman', basePrice: 12 },
    { name: 'James Vince', team: 'Karachi Kings', role: 'batsman', basePrice: 11 },
    { name: 'Sharjeel Khan', team: 'Karachi Kings', role: 'batsman', basePrice: 9 },
    { name: 'Ben Dunk', team: 'Karachi Kings', role: 'batsman', basePrice: 8 },
    // AR (4)
    { name: 'Kieron Pollard', team: 'Karachi Kings', role: 'all-rounder', basePrice: 10 },
    { name: 'Irfan Khan', team: 'Karachi Kings', role: 'all-rounder', basePrice: 9 },
    { name: 'Shoaib Malik', team: 'Karachi Kings', role: 'all-rounder', basePrice: 9 },
    { name: 'Arafat Minhas', team: 'Karachi Kings', role: 'all-rounder', basePrice: 8 },
    // BOWL (5)
    { name: 'Mohammad Amir', team: 'Karachi Kings', role: 'bowler', basePrice: 12 },
    { name: 'Hasan Ali', team: 'Karachi Kings', role: 'bowler', basePrice: 11 },
    { name: 'Tabraiz Shamsi', team: 'Karachi Kings', role: 'bowler', basePrice: 9 },
    { name: 'Mir Hamza', team: 'Karachi Kings', role: 'bowler', basePrice: 8 },
    { name: 'Usman Khan Shinwari', team: 'Karachi Kings', role: 'bowler', basePrice: 7 },
  ],

  'Lahore Qalandars': [
    // WK (2)
    { name: 'Phil Salt', team: 'Lahore Qalandars', role: 'wicketkeeper', basePrice: 10 },
    { name: 'Zeeshan Ashraf', team: 'Lahore Qalandars', role: 'wicketkeeper', basePrice: 7 },
    // BAT (5)
    { name: 'Fakhar Zaman', team: 'Lahore Qalandars', role: 'batsman', basePrice: 13 },
    { name: 'Abdullah Shafique', team: 'Lahore Qalandars', role: 'batsman', basePrice: 10 },
    { name: 'Harry Brook', team: 'Lahore Qalandars', role: 'batsman', basePrice: 10 },
    { name: 'Kamran Ghulam', team: 'Lahore Qalandars', role: 'batsman', basePrice: 9 },
    { name: 'Sahibzada Farhan', team: 'Lahore Qalandars', role: 'batsman', basePrice: 7 },
    // AR (4)
    { name: 'Rashid Khan', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 15 },
    { name: 'Sikandar Raza', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 12 },
    { name: 'David Wiese', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 10 },
    { name: 'Mohammad Hafeez', team: 'Lahore Qalandars', role: 'all-rounder', basePrice: 9 },
    // BOWL (5)
    { name: 'Shaheen Shah Afridi', team: 'Lahore Qalandars', role: 'bowler', basePrice: 14 },
    { name: 'Haris Rauf', team: 'Lahore Qalandars', role: 'bowler', basePrice: 13 },
    { name: 'Ahmed Daniyal', team: 'Lahore Qalandars', role: 'bowler', basePrice: 8 },
    { name: 'Dilbar Hussain', team: 'Lahore Qalandars', role: 'bowler', basePrice: 7 },
    { name: 'Maaz Khan', team: 'Lahore Qalandars', role: 'bowler', basePrice: 7 },
  ],

  'Multan Sultans': [
    // WK (2)
    { name: 'Mohammad Rizwan', team: 'Multan Sultans', role: 'wicketkeeper', basePrice: 15 },
    { name: 'Ben Duckett', team: 'Multan Sultans', role: 'wicketkeeper', basePrice: 8 },
    // BAT (5)
    { name: 'Iftikhar Ahmed', team: 'Multan Sultans', role: 'batsman', basePrice: 11 },
    { name: 'Reeza Hendricks', team: 'Multan Sultans', role: 'batsman', basePrice: 10 },
    { name: 'Tayyab Tahir', team: 'Multan Sultans', role: 'batsman', basePrice: 8 },
    { name: 'Sohaib Maqsood', team: 'Multan Sultans', role: 'batsman', basePrice: 8 },
    { name: 'Johnson Charles', team: 'Multan Sultans', role: 'batsman', basePrice: 8 },
    // AR (4)
    { name: 'Mohammad Nawaz', team: 'Multan Sultans', role: 'all-rounder', basePrice: 10 },
    { name: 'Tim David', team: 'Multan Sultans', role: 'all-rounder', basePrice: 10 },
    { name: 'Khushdil Shah', team: 'Multan Sultans', role: 'all-rounder', basePrice: 9 },
    { name: 'David Willey', team: 'Multan Sultans', role: 'all-rounder', basePrice: 9 },
    // BOWL (5)
    { name: 'Usama Mir', team: 'Multan Sultans', role: 'bowler', basePrice: 9 },
    { name: 'Chris Jordan', team: 'Multan Sultans', role: 'bowler', basePrice: 11 },
    { name: 'Abbas Afridi', team: 'Multan Sultans', role: 'bowler', basePrice: 9 },
    { name: 'Shahnawaz Dahani', team: 'Multan Sultans', role: 'bowler', basePrice: 9 },
    { name: 'Imran Tahir', team: 'Multan Sultans', role: 'bowler', basePrice: 8 },
  ],

  'Peshawar Zalmi': [
    // WK (2)
    { name: 'Mohammad Haris', team: 'Peshawar Zalmi', role: 'wicketkeeper', basePrice: 10 },
    { name: 'Kamran Akmal', team: 'Peshawar Zalmi', role: 'wicketkeeper', basePrice: 8 },
    // BAT (5)
    { name: 'Babar Azam', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 15 },
    { name: 'Saim Ayub', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 11 },
    { name: 'Tom Kohler-Cadmore', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 9 },
    { name: 'Rovman Powell', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 9 },
    { name: 'Yasir Khan', team: 'Peshawar Zalmi', role: 'batsman', basePrice: 7 },
    // AR (4)
    { name: 'Daniel Sams', team: 'Peshawar Zalmi', role: 'all-rounder', basePrice: 10 },
    { name: 'Liam Livingstone', team: 'Peshawar Zalmi', role: 'all-rounder', basePrice: 10 },
    { name: 'Daryl Mitchell', team: 'Peshawar Zalmi', role: 'all-rounder', basePrice: 9 },
    { name: 'Paul Walter', team: 'Peshawar Zalmi', role: 'all-rounder', basePrice: 8 },
    // BOWL (5)
    { name: 'Wahab Riaz', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 9 },
    { name: 'Luke Wood', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 10 },
    { name: 'Mehran Mumtaz', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 8 },
    { name: 'Sufiyan Muqeem', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 9 },
    { name: 'Arshad Iqbal', team: 'Peshawar Zalmi', role: 'bowler', basePrice: 8 },
  ],

  'Quetta Gladiators': [
    // WK (2)
    { name: 'Umar Akmal', team: 'Quetta Gladiators', role: 'wicketkeeper', basePrice: 8 },
    { name: 'Will Smeed', team: 'Quetta Gladiators', role: 'wicketkeeper', basePrice: 7 },
    // BAT (5)
    { name: 'Rilee Rossouw', team: 'Quetta Gladiators', role: 'batsman', basePrice: 12 },
    { name: 'Saud Shakeel', team: 'Quetta Gladiators', role: 'batsman', basePrice: 11 },
    { name: 'Jason Roy', team: 'Quetta Gladiators', role: 'batsman', basePrice: 10 },
    { name: 'Chris Gayle', team: 'Quetta Gladiators', role: 'batsman', basePrice: 9 },
    { name: 'Omair Bin Yousuf', team: 'Quetta Gladiators', role: 'batsman', basePrice: 8 },
    // AR (4)
    { name: 'Sherfane Rutherford', team: 'Quetta Gladiators', role: 'all-rounder', basePrice: 10 },
    { name: 'Akeal Hosein', team: 'Quetta Gladiators', role: 'all-rounder', basePrice: 9 },
    { name: 'Ben Cutting', team: 'Quetta Gladiators', role: 'all-rounder', basePrice: 8 },
    { name: 'Anwar Ali', team: 'Quetta Gladiators', role: 'all-rounder', basePrice: 7 },
    // BOWL (5)
    { name: 'Mohammad Wasim Jr', team: 'Quetta Gladiators', role: 'bowler', basePrice: 11 },
    { name: 'Mohammad Hasnain', team: 'Quetta Gladiators', role: 'bowler', basePrice: 9 },
    { name: 'Khurram Shahzad', team: 'Quetta Gladiators', role: 'bowler', basePrice: 9 },
    { name: 'Usman Tariq', team: 'Quetta Gladiators', role: 'bowler', basePrice: 8 },
    { name: 'Sohail Khan', team: 'Quetta Gladiators', role: 'bowler', basePrice: 7 },
  ],
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const PUBLIC_PLAYERS_DIR = resolve(process.cwd(), 'apps/web/public/players');

function resolvePhotoUrl(externalId: string): string | null {
  for (const ext of IMAGE_EXTENSIONS) {
    if (existsSync(resolve(PUBLIC_PLAYERS_DIR, `${externalId}.${ext}`))) {
      return `/players/${externalId}.${ext}`;
    }
  }
  return null;
}

const players: PlayerSeed[] = [];
let counter = 0;

for (const [, squad] of Object.entries(SQUADS)) {
  for (const p of squad) {
    counter++;
    const externalId = `psl2026-${counter.toString().padStart(4, '0')}`;
    players.push({
      externalId,
      ...p,
      photoUrl: resolvePhotoUrl(externalId),
    });
  }
}

const outPath = resolve(__dirname, "../../../data/psl-2026-players.json");
writeFileSync(outPath, JSON.stringify(players, null, 2) + "\n");

const withPhoto = players.filter((p) => p.photoUrl);
console.log(`Wrote ${players.length} players to ${outPath} (${withPhoto.length} with photos)`);
