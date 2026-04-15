import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BoundaryLine Banner",
  description: "Static promo banner for BoundaryLine.",
};

const heroPills = [
  "Fantasy PSL",
  "BNDY Rewards",
  "Soulbound Trophies",
] as const;

const playerShowcase = [
  {
    name: "Babar Azam",
    role: "Anchor Batter",
    team: "Peshawar Zalmi",
    photoUrl: "/players/psl2026-0067.png",
    accent: "#f59e0b",
  },
  {
    name: "Shadab Khan",
    role: "All-Round Engine",
    team: "Islamabad United",
    photoUrl: "/players/psl2026-0008.png",
    accent: "#ef4444",
  },
  {
    name: "David Warner",
    role: "Powerplay Opener",
    team: "Karachi Kings",
    photoUrl: "/players/psl2026-0051.png",
    accent: "#3b82f6",
  },
] as const;

const leaderboardRows = [
  { rank: "#01", name: "SIM", points: "18.4K", accent: "text-secondary" },
  { rank: "#02", name: "FAIZ", points: "17.9K", accent: "text-primary" },
  { rank: "#03", name: "HAMZA", points: "17.2K", accent: "text-tertiary" },
] as const;

const trophyShowcase = [
  {
    tier: "Rank 1",
    image: "/prizes/tier-1-v5.png",
    glow: "rgba(219,118,25,0.35)",
  },
  {
    tier: "Top 3",
    image: "/prizes/tier-2-v5.png",
    glow: "rgba(84,233,138,0.3)",
  },
  {
    tier: "Top 10",
    image: "/prizes/tier-3-v5.png",
    glow: "rgba(196,208,221,0.22)",
  },
] as const;

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-on-surface-variant/70">
      {children}
    </p>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass-panel rounded-[2rem] border border-white/6 bg-surface-container-low/80 shadow-[0_28px_80px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/6 bg-surface-container/90 px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/65">
        {label}
      </p>
      <p className="mt-2 font-headline text-3xl font-bold text-on-surface">
        {value}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant/80">{hint}</p>
    </div>
  );
}

export default function BannerPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1720px]">
        <div className="overflow-x-auto pb-6">
          <section className="relative mx-auto min-w-[1440px] max-w-[1680px] overflow-hidden rounded-[2.75rem] border border-white/8 bg-[#0b1118] p-8 shadow-[0_40px_140px_rgba(0,0,0,0.45)] xl:p-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background: [
                  "radial-gradient(circle at 16% 14%, rgba(84,233,138,0.22), transparent 28%)",
                  "radial-gradient(circle at 84% 18%, rgba(255,183,131,0.16), transparent 24%)",
                  "radial-gradient(circle at 60% 74%, rgba(59,130,246,0.12), transparent 24%)",
                  "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
                ].join(", "),
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.85) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.85) 1px, transparent 1px)",
                backgroundSize: "72px 72px",
              }}
            />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="font-headline text-xl font-bold tracking-tight text-on-surface md:text-2xl">
                  BoundaryLine
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-on-surface-variant/70">
                  PSL 2026 • WireFluid Testnet
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                On-chain Junoon
              </div>
            </div>

            <div className="relative z-10 mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-6">
                <div className="max-w-2xl">
                  <SectionEyebrow>Draft. Earn. Jeeto.</SectionEyebrow>
                  <h1 className="mt-3 max-w-[11ch] font-headline text-6xl font-bold leading-[0.92] tracking-[-0.05em] text-on-surface xl:text-8xl">
                    PSL fantasy with real on-chain stakes.
                  </h1>
                  <p className="mt-5 max-w-[60ch] text-lg leading-8 text-on-surface-variant">
                    Pick your XI, track live match performance, earn tradable
                    BNDY, and claim soulbound trophies that prove you dominated
                    the season.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {heroPills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-white/8 bg-surface-container-low/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface"
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                <GlassCard className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <SectionEyebrow>Core Loop</SectionEyebrow>
                      <p className="mt-3 max-w-xl text-base leading-7 text-on-surface-variant">
                        BoundaryLine combines the best parts of the app in one
                        frame: squad-building, live match drama, token
                        progression, leaderboard tension, and trophy-worthy
                        rewards.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-[1.25rem] border border-white/6 bg-surface-container px-4 py-4">
                        <p className="font-headline text-3xl font-bold text-primary">
                          11
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                          Player XI
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/6 bg-surface-container px-4 py-4">
                        <p className="font-headline text-3xl font-bold text-secondary">
                          BNDY
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                          Earned On-Chain
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/6 bg-surface-container px-4 py-4">
                        <p className="font-headline text-3xl font-bold text-tertiary">
                          NFT
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                          Trophy Proof
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionEyebrow>Dashboard</SectionEyebrow>
                    <p className="mt-2 font-headline text-3xl font-bold text-on-surface">
                      Matchday control room
                    </p>
                  </div>
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    Live Core Experience
                  </div>
                </div>

                <div className="mt-6 rounded-[2rem] border border-white/6 bg-surface-container-low p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-surface-container">
                        <Image
                          src="/team-logos/peshawar-zalmi.png"
                          alt="Peshawar Zalmi"
                          width={64}
                          height={64}
                          className="object-contain"
                          priority
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">
                          PZ
                        </p>
                        <p className="font-headline text-4xl font-bold text-on-surface">
                          186/6
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="scoreboard-wordmark text-4xl">
                        <span>PZ</span>
                        <span className="scoreboard-vs">vs</span>
                        <span>IU</span>
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                        Rawalpindi • Matchday 07
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">
                          IU
                        </p>
                        <p className="font-headline text-4xl font-bold text-on-surface">
                          171/9
                        </p>
                      </div>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-error/20 bg-surface-container">
                        <Image
                          src="/team-logos/islamabad-united.png"
                          alt="Islamabad United"
                          width={64}
                          height={64}
                          className="object-contain"
                          priority
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <MetricTile
                      label="Squad Points"
                      value="842"
                      hint="Real match fantasy output"
                    />
                    <MetricTile
                      label="Global Rank"
                      value="#24"
                      hint="Still climbing"
                    />
                    <MetricTile
                      label="Wallet BNDY"
                      value="12.6K"
                      hint="Tradable balance"
                    />
                    <MetricTile
                      label="Claim Status"
                      value="Top 10"
                      hint="Prize-eligible tier"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="rounded-[1.75rem] border border-white/6 bg-surface-container p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <SectionEyebrow>Players</SectionEyebrow>
                        <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                          Draft the match-winning XI
                        </p>
                      </div>
                      <p className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        11 slots
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-4">
                      {playerShowcase.map((player) => (
                        <div
                          key={player.name}
                          className="rounded-[1.5rem] border border-white/6 bg-surface-container-low p-4"
                        >
                          <div
                            className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border"
                            style={{
                              borderColor: `${player.accent}66`,
                              boxShadow: `0 0 0 6px ${player.accent}15`,
                            }}
                          >
                            <Image
                              src={player.photoUrl}
                              alt={player.name}
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          </div>
                          <p className="mt-4 font-headline text-lg font-bold text-on-surface">
                            {player.name}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-on-surface-variant/70">
                            {player.role}
                          </p>
                          <p className="mt-3 text-sm text-on-surface-variant/80">
                            {player.team}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/6 bg-surface-container p-5">
                    <SectionEyebrow>Leaderboard</SectionEyebrow>
                    <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                      Prize ladder tension
                    </p>
                    <div className="mt-5 space-y-3">
                      {leaderboardRows.map((row) => (
                        <div
                          key={row.rank}
                          className="flex items-center justify-between rounded-[1.25rem] border border-white/6 bg-surface-container-low px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-headline text-xl font-bold ${row.accent}`}
                            >
                              {row.rank}
                            </span>
                            <span className="font-headline text-lg font-bold text-on-surface">
                              {row.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-on-surface-variant">
                            {row.points} BNDY
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[1.35rem] border border-primary/20 bg-primary/10 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">
                        Sync Flow
                      </p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                        Off-chain fantasy points become on-chain BNDY when users
                        choose to sync.
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="relative z-10 mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <GlassCard className="p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <SectionEyebrow>Trophies</SectionEyebrow>
                    <p className="mt-2 font-headline text-3xl font-bold text-on-surface">
                      Claim real rewards. Mint permanent proof.
                    </p>
                  </div>
                  <div className="rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                    Soulbound Rewards
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {trophyShowcase.map((trophy) => (
                    <div
                      key={trophy.tier}
                      className="relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-surface-container-low px-5 py-5 text-center"
                      style={{ boxShadow: `0 26px 60px ${trophy.glow}` }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/65">
                        {trophy.tier}
                      </p>
                      <div className="relative mx-auto mt-4 h-40 w-40">
                        <Image
                          src={trophy.image}
                          alt={trophy.tier}
                          fill
                          className="object-contain"
                          sizes="160px"
                        />
                      </div>
                      <p className="mt-4 font-headline text-xl font-bold text-on-surface">
                        Verified victory
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <div className="grid gap-6">
                <GlassCard className="p-6">
                  <SectionEyebrow>Pitch</SectionEyebrow>
                  <p className="mt-3 font-headline text-3xl font-bold leading-tight text-on-surface">
                    BoundaryLine is PSL fantasy with on-chain junoon.
                  </p>
                  <p className="mt-4 text-base leading-7 text-on-surface-variant">
                    Draft smart, earn BNDY from real matches, and jeeto rewards
                    that live on-chain forever.
                  </p>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <SectionEyebrow>Visual Motifs</SectionEyebrow>
                      <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                        Teams. Tokens. Trophies.
                      </p>
                    </div>
                    <div className="flex -space-x-4">
                      {[
                        "/team-logos/lahore-qalandars.png",
                        "/team-logos/karachi-kings.png",
                        "/team-logos/hyderabad-kingsmen.png",
                      ].map((logoPath, index) => (
                        <div
                          key={logoPath}
                          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-surface-container"
                          style={{ zIndex: 3 - index }}
                        >
                          <Image
                            src={logoPath}
                            alt="Franchise logo"
                            width={44}
                            height={44}
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
