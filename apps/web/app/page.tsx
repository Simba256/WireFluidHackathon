import Image from "next/image";
import { LandingNav } from "@/components/landing-nav";
import { HeroWalletActions } from "@/components/hero-wallet-actions";
import { FinalCtaWalletAction } from "@/components/final-cta-wallet-action";
import { AppPrefetcher } from "@/components/app-prefetcher";
import { NextMatchCountdown } from "@/components/next-match-countdown";
import {
  ScrollReveal,
  ScrollRevealItem,
  FloatReveal,
} from "@/components/scroll-reveal";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAtbiBkfh0n1iYWKJMjnClUdsWtk1Q4C62aZY8v6bwhAq7VX1D2aWH5tm13PHdZP6YfsEoRJPLzBMToJhuDf9piAyi87MeHaifldMn71CHd8GhG4ROP83ViTOJ0DBTWmUlFY7iizvt7m74oQB8fe61Az0Q0lbsEl3cT4xkzEsdl_vgm9AXXjlDkNzWsiH1wuqQwdY43Bv-Lcsy0RSE0mpRwH-LM9CvALwzFiZm72EZm4qmXx3fbswmCjEB9TGfvRISB5XZ7j0D_Pgau";

const PLAYER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAqs9I_VKcNNKsgwQMz-YBH5dUBys5mWQpkDgnY8-GcSFuj4sfty_H_OTPBOf7NfQKbFqbSXTg2OjIwo_38JJni1ilhYDfAX8ujOcefq30Tk3whzwl33l0uCto23-v9DYzZirnSOoulTjT-f05oZaRi7EGxTivoPmlEYLyFwiXG2xyh0b_efF6BCmOaL5p5Npl_izC88D2Hqo5SB9NboNlaIcKFi8BjspguPbjN0x6a5U5OhtktXDtTuthqTI_D4O7IKZhn2c4fCzh4";

const CTA_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuACVmFx4w_F9Dstn74mk_Kr2d-4bYhdUMGXSXULeKvtvCke8tUIf9XBAuAyNJJlzX7RrH7dbvQgHjUvIb94qEz_WOxQNQjohM4fDZ1C2KE7eKiCePVqGPiAW6S8jTbDnZeASoLGwKCta8fT3N9f6eksZNYbrH2oAxvRD0vefHgDGsl4jJCCV9fqxxwUEB6NC04RZy7l4JHrRldgEp815DAqVussnBUEW3XyRtGZRiHmlBzt5rwZOjTtP18eJeLZp08GChGBDF4k1sE3";

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[921px] flex items-center overflow-hidden stadium-gradient">
      {/* Background image */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
        <Image
          src={HERO_IMAGE}
          alt="Cricket Stadium"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal className="max-w-4xl">
          {/* Live badge */}
          <ScrollRevealItem className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-primary text-xs font-bold uppercase tracking-widest font-label">
              PSL 2026 Edition LIVE
            </span>
          </ScrollRevealItem>

          <ScrollRevealItem>
            <h1 className="text-6xl md:text-8xl font-headline font-bold text-on-surface leading-[0.9] tracking-tighter mb-8 italic">
              PLAY FANTASY PSL.
              <br />
              EARN <span className="text-primary">BNDY.</span>
              <br />
              WIN REAL PRIZES.
            </h1>
          </ScrollRevealItem>

          <ScrollRevealItem>
            <p className="text-xl md:text-2xl text-slate-400 font-body max-w-2xl mb-12">
              The first high-stakes cricket management engine built on
              WireFluid. Draft your squad, dominate the pitch, and sync your
              wins to the blockchain.
            </p>
          </ScrollRevealItem>

          <ScrollRevealItem>
            <HeroWalletActions />
          </ScrollRevealItem>
        </ScrollReveal>
      </div>

      {/* Asymmetric floating data card */}
      <FloatReveal className="hidden xl:block absolute right-[-5%] top-[20%] w-[500px] h-[600px] bg-surface-container-high/60 backdrop-blur-2xl rounded-[4rem] border-l border-t border-white/10 p-12 shadow-2xl">
        <div className="flex justify-between items-start mb-12">
          <div className="bg-secondary p-4 rounded-3xl rotate-3">
            <Icon name="military_tech" className="text-on-secondary text-4xl" />
          </div>
          <div className="text-right">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
              Season Pool
            </p>
            <p className="text-4xl font-headline font-black text-secondary">
              5,000,000 $BNDY
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Top performer card */}
          <div className="bg-surface-container-highest/40 p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm">Top Performer</span>
              <span className="text-primary font-bold">#1 Ranked</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-surface-container rounded-2xl overflow-hidden relative">
                <Image
                  src={PLAYER_IMAGE}
                  alt="Babar Azam"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold">Babar Azam</h3>
                <p className="text-slate-500 text-sm">Points: 2,450 XP</p>
              </div>
            </div>
          </div>

          {/* Platform stats */}
          <div className="p-6">
            <p className="text-xs uppercase font-black tracking-[0.2em] text-slate-500 mb-4">
              Platform Stats
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-headline font-bold">124K</p>
                <p className="text-xs text-slate-400">Active Managers</p>
              </div>
              <div>
                <p className="text-3xl font-headline font-bold text-primary">
                  12.4M
                </p>
                <p className="text-xs text-slate-400">Transactions</p>
              </div>
            </div>
          </div>
        </div>
      </FloatReveal>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="bg-surface-container-low border-y border-outline-variant/10 py-12">
      <div className="container mx-auto px-6">
        <ScrollReveal className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <ScrollRevealItem className="group">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">
              Total Players Registered
            </p>
            <p className="text-5xl font-headline font-black group-hover:text-primary transition-colors">
              458,291
            </p>
          </ScrollRevealItem>
          <ScrollRevealItem className="group">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">
              Total BNDY Earned
            </p>
            <p className="text-5xl font-headline font-black text-primary group-hover:scale-105 transition-transform inline-block">
              2,840,119
            </p>
          </ScrollRevealItem>
          <ScrollRevealItem className="group">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">
              Next Match Starts In
            </p>
            <NextMatchCountdown />
          </ScrollRevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: "sports_cricket",
    title: "Pick team",
    description:
      "Select 11 stars from the PSL squads and lock your team for the tournament.",
    accent: "primary" as const,
  },
  {
    icon: "query_stats",
    title: "Score points",
    description:
      "Real-time PSL match data drives your fantasy score. Every wicket and six matters.",
    accent: "primary" as const,
  },
  {
    icon: "link",
    title: "Sync to chain",
    description:
      "Your results are recorded on WireFluid. Transparent, immutable, and high-speed validation.",
    accent: "primary" as const,
  },
  {
    icon: "payments",
    title: "Claim prizes",
    description:
      "Instant payouts in $BNDY. Swap, stake, or climb the ranks for grand prizes.",
    accent: "secondary" as const,
  },
];

const ACCENT_CLASSES = {
  primary: {
    border: "border-primary",
    bg: "bg-primary/10",
    text: "text-primary",
  },
  secondary: {
    border: "border-secondary",
    bg: "bg-secondary/10",
    text: "text-secondary",
  },
} as const;

function HowItWorks() {
  return (
    <section className="py-24 bg-surface">
      <div className="container mx-auto px-6">
        <ScrollReveal className="text-center mb-20">
          <ScrollRevealItem>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4 tracking-tight">
              The Winning Loop
            </h2>
          </ScrollRevealItem>
          <ScrollRevealItem>
            <p className="text-slate-400 max-w-xl mx-auto">
              From drafting your first XI to claiming rewards on the WireFluid
              testnet, BoundaryLine is built for performance.
            </p>
          </ScrollRevealItem>
        </ScrollReveal>

        <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step) => {
            const cls = ACCENT_CLASSES[step.accent];
            return (
              <ScrollRevealItem
                key={step.title}
                className={`bg-surface-container-low p-8 rounded-[2rem] border-b-4 ${cls.border} hover:-translate-y-2 transition-transform`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl ${cls.bg} flex items-center justify-center mb-6`}
                >
                  <Icon name={step.icon} className={`${cls.text} text-3xl`} />
                </div>
                <h3 className="font-headline text-2xl font-bold mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </ScrollRevealItem>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="bg-surface-container-highest rounded-[3rem] overflow-hidden relative p-12 md:p-24">
          {/* Background image */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none hidden lg:block">
            <Image
              src={CTA_IMAGE}
              alt="Cricket Motion"
              fill
              className="object-cover"
            />
          </div>

          <ScrollReveal className="relative z-10 max-w-2xl">
            <ScrollRevealItem>
              <h2 className="text-5xl md:text-7xl font-headline font-bold italic tracking-tighter mb-8 leading-tight">
                THE STADIUM <br />
                <span className="text-secondary">IS WAITING.</span>
              </h2>
            </ScrollRevealItem>
            <ScrollRevealItem>
              <p className="text-xl text-slate-300 mb-10 leading-relaxed">
                Don&apos;t just watch the game. Own the outcome. Join the most
                advanced fantasy ecosystem in the sport.
              </p>
            </ScrollRevealItem>

            <ScrollRevealItem>
              <div className="space-y-4">
                {[
                  "Zero Gas Fees on Testnet",
                  "Exclusive NFT Player Cards",
                  "Direct Wallet Payouts",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 text-primary"
                  >
                    <Icon name="check_circle" />
                    <span className="font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </ScrollRevealItem>

            <ScrollRevealItem>
              <FinalCtaWalletAction />
            </ScrollRevealItem>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0e141b] w-full py-12 px-8 border-t border-outline-variant/10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <span className="font-headline font-bold text-primary text-2xl">
            BoundaryLine
          </span>
          <p className="text-slate-500 font-body text-sm">
            &copy; 2026 BoundaryLine. Powered by WireFluid Testnet.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 font-body text-sm">
          {[
            "Tournament Rules",
            "Terms of Play",
            "Smart Contracts",
            "Support",
          ].map((link) => (
            <a
              key={link}
              className="text-slate-500 hover:text-secondary transition-colors duration-300"
              href="#"
            >
              {link}
            </a>
          ))}
        </div>
        <div className="flex gap-4">
          {["public", "share"].map((icon) => (
            <div
              key={icon}
              className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-slate-400 hover:text-primary cursor-pointer transition-colors"
            >
              <Icon name={icon} className="text-xl" />
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

function MobileBottomNav() {
  const items = [
    { icon: "grid_view", label: "Dashboard", active: true },
    { icon: "bolt", label: "Play", active: false },
    { icon: "trophy", label: "Rankings", active: false },
    { icon: "payments", label: "Prizes", active: false },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 px-4 bg-[#0e141b]/90 backdrop-blur-xl border-t border-white/10 z-50">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex flex-col items-center justify-center ${
            item.active ? "text-primary scale-110" : "text-slate-500"
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={
              item.active ? { fontVariationSettings: "'FILL' 1" } : undefined
            }
          >
            {item.icon}
          </span>
          <span className="font-label text-[10px] font-bold uppercase mt-1">
            {item.label}
          </span>
        </div>
      ))}
    </nav>
  );
}

export default function HomePage() {
  return (
    <>
      <AppPrefetcher />
      <LandingNav />
      <main className="pt-16">
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
