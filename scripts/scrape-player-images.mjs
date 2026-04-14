#!/usr/bin/env node

/**
 * Scrapes cricket player headshot images from ESPN's public search API,
 * with Wikipedia as a fallback source.
 *
 * Usage: node scripts/scrape-player-images.mjs
 *
 * For each real named player in data/psl-2026-players.json:
 *   1. Tries ESPN cricket search API for a headshot PNG
 *   2. Falls back to Wikipedia REST API for a thumbnail
 * Saves images to apps/web/public/players/{externalId}.png
 *
 * Skips generic placeholder names (e.g. "Islamabad Squad 1").
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLAYERS_JSON = join(ROOT, "data", "psl-2026-players.json");
const OUTPUT_DIR = join(ROOT, "apps", "web", "public", "players");

const ESPN_SEARCH_URL =
  "https://site.api.espn.com/apis/common/v3/search?type=player&sport=cricket&limit=5&query=";

const WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";

const DEFAULT_HEADSHOT_PATTERN = /default-player-logo/;

const PLACEHOLDER_PATTERN =
  /^(Islamabad|Karachi|Lahore|Multan|Peshawar|Quetta)\s+(Squad|Reserve)\s+\d+$/;

const DELAY_MS = 800;

/**
 * Manual Wikipedia title overrides for names that don't map 1:1.
 * Key = player name from JSON, Value = Wikipedia article title.
 */
const WIKI_TITLE_OVERRIDES = {
  "Azam Khan": "Azam_Khan_(cricketer,_born_1998)",
  "Naseem Shah": "Naseem_Shah",
  "Haider Ali": "Haider_Ali_(cricketer)",
  "Shan Masood": "Shan_Masood",
  "Irfan Khan": "Irfan_Khan_Niazi",
  "Arafat Minhas": "Arafat_Minhas",
  "Tim Seifert": "Tim_Seifert",
  "Mohammad Rizwan": "Mohammad_Rizwan",
  "Iftikhar Ahmed": "Iftikhar_Ahmed_(cricketer)",
  "Mohammad Nawaz": "Mohammad_Nawaz_(cricketer,_born_1994)",
  "Usama Mir": "Usama_Mir",
  "Tayyab Tahir": "Tayyab_Tahir",
  "Abbas Afridi": "Abbas_Afridi",
  "Saim Ayub": "Saim_Ayub",
  "Mehran Mumtaz": "Mehran_Mumtaz",
  "Luke Wood": "Luke_Wood_(cricketer)",
  "Daniel Sams": "Daniel_Sams",
  "Sufiyan Muqeem": "Sufiyan_Muqeem",
  "Paul Walter": "Paul_Walter_(cricketer)",
  "Mohammad Haris": "Mohammad_Haris_(cricketer)",
  "Saud Shakeel": "Saud_Shakeel",
  "Mohammad Wasim Jr": "Mohammad_Wasim_Jr.",
  "Akeal Hosein": "Akeal_Hosein",
  "Omair Bin Yousuf": "Omair_Bin_Yousuf",
  "Khurram Shahzad": "Khurram_Shahzad_(cricketer)",
  "Sherfane Rutherford": "Sherfane_Rutherford",
  "Usman Tariq": "Usman_Tariq_(cricketer)",
  "Rumman Raees": "Rumman_Raees",
  "Matthew Short": "Matthew_Short_(cricketer)",
  "David Wiese": "David_Wiese",
  "Haris Rauf": "Haris_Rauf",
  "Abdullah Shafique": "Abdullah_Shafique",
  "Shaheen Shah Afridi": "Shaheen_Shah_Afridi",
  "Asif Ali": "Asif_Ali_(cricketer)",
  "Zaman Khan": "Zaman_Khan_(cricketer)",
  "Ben Dunk": "Ben_Dunk",
  "Usman Khan Shinwari": "Usman_Khan_Shinwari",
  "Kamran Ghulam": "Kamran_Ghulam",
  "Johnson Charles": "Johnson_Charles",
  "Tim David": "Tim_David",
  "Khushdil Shah": "Khushdil_Shah",
  "Shahnawaz Dahani": "Shahnawaz_Dahani",
  "Kamran Akmal": "Kamran_Akmal",
  "Tom Kohler-Cadmore": "Tom_Kohler-Cadmore",
  "Rovman Powell": "Rovman_Powell",
  "Liam Livingstone": "Liam_Livingstone_(cricketer)",
  "Daryl Mitchell": "Daryl_Mitchell_(cricketer)",
  "Will Smeed": "Will_Smeed",
  "Ben Cutting": "Ben_Cutting",
  "Anwar Ali": "Anwar_Ali_(cricketer,_born_1987)",
  "Mohammad Hasnain": "Mohammad_Hasnain",
  "Dilbar Hussain": "Dilbar_Hussain",
  "Sahibzada Farhan": "Sahibzada_Farhan",
  "Hunain Shah": "Hunain_Shah",
  "Yasir Khan": "Yasir_Khan_(cricketer,_born_2002)",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchESPN(name) {
  const url = ESPN_SEARCH_URL + encodeURIComponent(name);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;

  const best = data.items[0];
  const headshotUrl = best.headshot?.href;
  if (!headshotUrl || DEFAULT_HEADSHOT_PATTERN.test(headshotUrl)) return null;

  return { url: headshotUrl, source: "espn", label: best.displayName };
}

async function searchWikipedia(name) {
  const title = WIKI_TITLE_OVERRIDES[name] || name.replace(/ /g, "_");
  const variants = [
    title,
    `${title}_(cricketer)`,
  ];

  for (const variant of variants) {
    try {
      const url = WIKI_SUMMARY_URL + encodeURIComponent(variant);
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      if (data.type === "disambiguation") continue;

      const imgUrl =
        data.originalimage?.source || data.thumbnail?.source;
      if (!imgUrl) continue;

      const desc = data.description || "";
      if (!desc.toLowerCase().includes("cricket")) {
        if (variants.indexOf(variant) === 0 && !WIKI_TITLE_OVERRIDES[name]) {
          continue;
        }
      }

      return { url: imgUrl, source: "wikipedia", label: data.title };
    } catch {
      continue;
    }
  }
  return null;
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
  return buffer.length;
}

async function main() {
  const players = JSON.parse(readFileSync(PLAYERS_JSON, "utf-8"));

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const realPlayers = players.filter((p) => !PLACEHOLDER_PATTERN.test(p.name));
  console.log(
    `Found ${realPlayers.length} real named players out of ${players.length} total.\n`
  );

  const results = { espn: [], wikipedia: [], skipped: [], failed: [] };

  for (const player of realPlayers) {
    const destPng = join(OUTPUT_DIR, `${player.externalId}.png`);
    const destJpg = join(OUTPUT_DIR, `${player.externalId}.jpg`);
    const hasPng = existsSync(destPng);
    const hasJpg = existsSync(destJpg);

    if (hasPng || hasJpg) {
      console.log(`  SKIP ${player.name} (already exists)`);
      results.skipped.push(player.name);
      continue;
    }

    // Try ESPN first
    let info = await searchESPN(player.name);
    if (info) {
      try {
        const bytes = await downloadImage(info.url, destPng);
        console.log(
          `  ESPN ${player.name} → ${player.externalId}.png (${(bytes / 1024).toFixed(1)} KB)`
        );
        results.espn.push(player.name);
        await sleep(DELAY_MS);
        continue;
      } catch {
        // ESPN image 404, fall through to Wikipedia
      }
    }

    await sleep(DELAY_MS);

    // Fallback: Wikipedia
    info = await searchWikipedia(player.name);
    if (info) {
      try {
        const ext = info.url.match(/\.(jpe?g|png|webp)/i)?.[1] || "jpg";
        const destPath = ext.toLowerCase().startsWith("png") ? destPng : destJpg;
        const bytes = await downloadImage(info.url, destPath);
        console.log(
          `  WIKI ${player.name} → ${player.externalId}.${ext} (${(bytes / 1024).toFixed(1)} KB) [${info.label}]`
        );
        results.wikipedia.push(player.name);
        await sleep(DELAY_MS);
        continue;
      } catch (err) {
        console.log(`  FAIL ${player.name} — wiki download: ${err.message}`);
      }
    } else {
      console.log(`  MISS ${player.name} — no image on ESPN or Wikipedia`);
    }

    results.failed.push(player.name);
    await sleep(DELAY_MS);
  }

  console.log(`\n--- Summary ---`);
  console.log(`  ESPN:       ${results.espn.length}`);
  console.log(`  Wikipedia:  ${results.wikipedia.length}`);
  console.log(`  Skipped:    ${results.skipped.length}`);
  console.log(`  Failed:     ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log(`\nFailed players:`);
    for (const name of results.failed) {
      console.log(`  - ${name}`);
    }
  }

  // Write manifest mapping externalId -> image path
  const manifest = {};
  for (const player of players) {
    const pngPath = join(OUTPUT_DIR, `${player.externalId}.png`);
    const jpgPath = join(OUTPUT_DIR, `${player.externalId}.jpg`);
    const hasPng = existsSync(pngPath);
    const hasJpg = existsSync(jpgPath);
    const ext = hasPng ? "png" : hasJpg ? "jpg" : null;
    manifest[player.externalId] = {
      name: player.name,
      hasImage: hasPng || hasJpg,
      file: ext ? `/players/${player.externalId}.${ext}` : null,
    };
  }
  writeFileSync(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest written.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
