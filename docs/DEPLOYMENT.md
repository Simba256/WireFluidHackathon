# Deployment

> Shipping BoundaryLine to production: Vercel (frontend + API) + WireFluid testnet (contracts) + Neon (database).

---

## Deployment Targets

| Layer | Host | Notes |
|---|---|---|
| Frontend + API | Vercel (Fluid Compute, Next.js 15) | Primary deployment |
| Database | Neon Postgres (production branch) | Pooled connection |
| Contracts | WireFluid testnet (chain ID 92533) | Already deployed once — only redeploy if ABIs change |
| Assets | Vercel Blob or Next.js `/public` | Player photos, prize images |

**Total infra cost**: $0 for the hackathon. Neon free tier, Vercel hobby plan, WireFluid testnet.

---

## First-Time Deployment

### Step 1 — Vercel Project Setup

```bash
npm i -g vercel@latest
cd boundaryline
vercel link
```

Choose:
- Scope: your personal account or team
- Link to existing project? No → create new
- Project name: `boundaryline`
- Directory: `./`
- Override build settings? No (auto-detected as Next.js)

### Step 2 — Neon Production Branch

1. In the Neon dashboard, your `boundaryline` project already has a `main` branch (created during setup).
2. For hackathon simplicity, use `main` directly. For real production, create a `prod` branch and keep `main` for previews.
3. Copy the production connection string (it includes `?sslmode=require&pgbouncer=true` for pooling).

### Step 3 — Environment Variables on Vercel

Run these commands from the repo root:

```bash
# Database
vercel env add DATABASE_URL production
# paste the Neon production connection string

# Signer
vercel env add SIGNER_PRIVATE_KEY production
# paste the 0x... hex key (NOT your personal wallet)

# Admin
vercel env add ADMIN_API_KEY production
# paste a strong random string

# SIWE / Auth
vercel env add AUTH_SECRET production
# paste: openssl rand -base64 32

vercel env add SIWE_DOMAIN production
# boundaryline.vercel.app (or your custom domain)

vercel env add SIWE_URL production
# https://boundaryline.vercel.app

# Public chain config (prefixed NEXT_PUBLIC_ to expose to client)
vercel env add NEXT_PUBLIC_CHAIN_ID production
# 92533

vercel env add NEXT_PUBLIC_RPC_URL production
# https://evm.wirefluid.com

vercel env add NEXT_PUBLIC_EXPLORER_URL production
# https://wirefluidscan.com

vercel env add NEXT_PUBLIC_PSL_POINTS_ADDRESS production
# 0x... (from your deployment)

vercel env add NEXT_PUBLIC_PSL_TROPHIES_ADDRESS production
# 0x... (from your deployment)
```

Alternatively, add them in the Vercel dashboard under **Settings → Environment Variables**.

### Step 4 — Deploy

```bash
vercel --prod
```

This builds and deploys. First deploy takes 2–5 minutes. Subsequent deploys are faster due to caching.

Visit the printed URL. Confirm:
- Landing page loads
- Wallet connect works
- Switching to WireFluid Testnet succeeds
- SIWE sign-in completes
- Reads from Postgres return expected data

### Step 5 — Database Migrations

On first deploy, push the schema:

```bash
# Point DATABASE_URL at prod temporarily in .env.local, or:
DATABASE_URL="<prod connection string>" pnpm db:push
DATABASE_URL="<prod connection string>" pnpm db:seed
```

**CAUTION**: `db:push` can drop columns if schema diverges. For hackathon, you're pushing to an empty DB, so it's safe. In real production, use `pnpm db:migrate` with committed migration files instead.

### Step 6 — Contract Deployment (only if redeploying)

If you're changing contracts after an initial deploy, redeploy from your local machine:

```bash
cd packages/contracts
pnpm deploy:testnet
```

Update the `NEXT_PUBLIC_PSL_POINTS_ADDRESS` and `NEXT_PUBLIC_PSL_TROPHIES_ADDRESS` env vars on Vercel, then redeploy the web app:

```bash
vercel --prod
```

---

## vercel.ts Configuration (recommended)

Create `vercel.ts` in the repo root for typed, dynamic config:

```ts
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'pnpm build',
  framework: 'nextjs',
  installCommand: 'pnpm install --frozen-lockfile',
  ignoreCommand: 'git diff --quiet HEAD^ HEAD ./apps/web ./packages',

  headers: [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
    {
      source: '/(.*)\\.(svg|png|jpg|webp)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=604800, immutable' },
      ],
    },
  ],

  // Optional: crons for refreshing the on-chain prize leaderboard cache
  crons: [
    {
      path: '/api/internal/refresh-prize-leaderboard',
      schedule: '*/1 * * * *', // every minute during tournament
    },
  ],
};
```

Install: `pnpm add -D @vercel/config`

---

## Domain Setup (optional, hackathon stretch)

If you have a domain:

1. `vercel domains add boundaryline.xyz`
2. Follow the DNS instructions (add A / CNAME records at your registrar)
3. Wait for SSL (auto-provisioned by Vercel within minutes)
4. Update `SIWE_DOMAIN` and `SIWE_URL` env vars to the new domain
5. Redeploy

---

## Preview Deployments

Every `git push` to a non-main branch creates a Vercel preview URL automatically.

**Important**: preview deployments share the same `DATABASE_URL` as prod by default. To isolate previews, use Neon's branching:

1. In Vercel dashboard: **Settings → Integrations → Neon**
2. Enable **Database branching for previews**
3. Each preview now gets its own short-lived Neon branch, auto-cleaned up when the branch merges

For hackathon, skip this — previews sharing the main DB is fine for 2 days.

---

## Rolling Back a Bad Deploy

```bash
vercel rollback <previous-deployment-url>
```

Or in the dashboard: **Deployments** → find the last good one → **Promote to Production**.

On-chain state (contracts, trophies, earnedBalance) is unaffected by frontend rollbacks. Only the UI code rolls back.

---

## Deployment Checklist (pre-demo)

- [ ] Contracts deployed to WireFluid testnet and verified on `wirefluidscan.com`
- [ ] `PSLPoints.setTrophies()` called and confirmed
- [ ] Backend signer key funded with a tiny amount of WIRE
- [ ] Neon DB schema pushed and seeded
- [ ] Player photos uploaded to `/public/players/`
- [ ] Prize images in `/public/prizes/`
- [ ] All env vars set on Vercel for production environment
- [ ] Landing page loads without errors
- [ ] SIWE wallet connect flow tested end-to-end
- [ ] Team creation → scoring → sync → claim flow tested end-to-end on a throwaway wallet
- [ ] At least one match scored to seed the leaderboard with realistic data
- [ ] At least one prize claimed by a demo wallet to showcase the trophy NFT
- [ ] Explorer links in the UI point to the correct network
- [ ] README has the live URL
- [ ] Demo video recorded
- [ ] Pitch deck ready

---

## Cost Monitoring

Vercel hobby plan has hard limits that shouldn't be exceeded during a hackathon:
- 100 GB-hours Fluid Compute per month (you'll use far less)
- 100 GB bandwidth
- Unlimited preview deployments

Neon free tier:
- 10 projects
- 3 GB storage per project
- 190 hours of compute per month (autosuspend after 5 min inactivity)

WireFluid testnet: all free.

**Total expected cost for the hackathon**: $0.

---

## Post-Hackathon Cleanup (if not continuing)

- Revoke the signer private key (stop using it)
- Delete the Vercel project or keep for archival
- Keep the deployed contracts as-is (they're on-chain forever, harmless)
- Export a snapshot of the database before deleting: `pg_dump <DATABASE_URL> > snapshot.sql`
