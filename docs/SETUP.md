# Local Development Setup

> Everything you need to run BoundaryLine on your machine.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS or newer | https://nodejs.org or `nvm install 20` |
| pnpm | 9.x | `npm install -g pnpm` |
| Git | any | https://git-scm.com |
| MetaMask | latest | https://metamask.io browser extension |
| A code editor | — | VS Code recommended |

Optional but nice:
- Foundry (for advanced contract testing): `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- Docker (for local Postgres instead of Neon): `https://docs.docker.com/get-docker/`

---

## 1. Clone & Install

```bash
git clone <repo-url> boundaryline
cd boundaryline
pnpm install
```

This installs dependencies across the full monorepo (frontend, contracts, shared packages).

---

## 2. WireFluid Testnet Wallet

1. Open MetaMask → **Add network manually**:
   - Network name: `WireFluid Testnet`
   - RPC URL: `https://evm.wirefluid.com`
   - Chain ID: `92533`
   - Currency symbol: `WIRE`
   - Block explorer: `https://wirefluidscan.com`
2. Visit `https://faucet.wirefluid.com` and request test WIRE for your wallet.
3. Confirm your balance shows up in MetaMask under the WireFluid Testnet network.

You'll need gas to deploy contracts and sign transactions. Request enough for ~20 txs.

---

## 3. Create a Backend Signer Wallet

The backend needs a dedicated EOA to sign EIP-712 vouchers. **This wallet should NOT be your personal wallet** — treat it like a service account.

1. Generate a new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Save the resulting hex string somewhere safe (you'll paste it into `.env.local` in the next step).
3. Derive the public address from that key:
   ```bash
   node -e "console.log(new (require('ethers')).Wallet('0x<your-hex>').address)"
   ```
4. Fund this address with a small amount of testnet WIRE (it only needs gas for occasional debugging — most signing happens off-chain and requires no gas).

**Security note**: in production, this key would live in a KMS. For hackathon, `.env.local` is fine.

---

## 4. Database (Neon Postgres)

### Option A — Neon (recommended, free tier)

1. Sign up at https://neon.tech
2. Create a new project named `boundaryline`
3. Copy the connection string — it looks like `postgres://user:pass@ep-xyz.region.neon.tech/boundaryline`
4. Paste into `.env.local` as `DATABASE_URL` in the next step

### Option B — Local Postgres via Docker

```bash
docker run -d \
  --name boundaryline-pg \
  -e POSTGRES_USER=boundaryline \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=boundaryline \
  -p 5432:5432 \
  postgres:16
```

Connection string: `postgres://boundaryline:dev@localhost:5432/boundaryline`

---

## 5. Environment Variables

Copy the example file and fill in the blanks:

```bash
cp .env.example .env.local
```

Required values in `.env.local`:

```bash
# Database
DATABASE_URL="postgres://..."

# Backend signer wallet (EIP-712 voucher signing)
SIGNER_PRIVATE_KEY="0x<hex from step 3>"

# Admin API key (for scoring panel)
ADMIN_API_KEY="<generate a random 32+ char string>"

# SIWE config
SIWE_DOMAIN="localhost:3000"
SIWE_URL="http://localhost:3000"

# Session JWT (jose HS256, direct — not NextAuth)
AUTH_SECRET="<generate: openssl rand -base64 32>"

# Chain config
NEXT_PUBLIC_CHAIN_ID="92533"
NEXT_PUBLIC_RPC_URL="https://evm.wirefluid.com"
NEXT_PUBLIC_EXPLORER_URL="https://wirefluidscan.com"

# Contract addresses (filled in after deployment — step 7)
NEXT_PUBLIC_PSL_POINTS_ADDRESS=""
NEXT_PUBLIC_PSL_TROPHIES_ADDRESS=""
```

Never commit `.env.local`. It's already in `.gitignore`.

---

## 6. Database Migrations & Seed

```bash
pnpm db:push            # apply schema to your database
pnpm db:seed            # load PSL 2026 players, prize tiers, tournament row
```

Verify by opening Drizzle Studio:

```bash
pnpm db:studio
```

You should see `player` populated with ~150 rows.

---

## 7. Deploy Contracts to WireFluid Testnet

```bash
cd packages/contracts
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY (use a testnet-only wallet with WIRE faucet funds)
# Fill in SIGNER_ADDRESS (the public address from step 3)

pnpm compile
pnpm test                # run Hardhat test suite (should pass)
pnpm deploy:testnet      # deploys PSLPoints + PSLTrophies, writes addresses to deployments/wirefluid-testnet.json
```

The deploy script will print the two contract addresses. Copy them into the root `.env.local`:

```bash
NEXT_PUBLIC_PSL_POINTS_ADDRESS="0x..."
NEXT_PUBLIC_PSL_TROPHIES_ADDRESS="0x..."
```

Verify on the explorer:
- `https://wirefluidscan.com/address/<PSL_POINTS_ADDRESS>`
- `https://wirefluidscan.com/address/<PSL_TROPHIES_ADDRESS>`

---

## 8. Run the App

```bash
cd ../..       # back to repo root
pnpm dev
```

Next.js should boot at `http://localhost:3000`. You should be able to:

1. Click **Connect Wallet** → MetaMask prompts → switch to WireFluid Testnet → sign SIWE
2. Navigate to `/play` and pick a team
3. Visit the admin panel at `/admin` with your `ADMIN_API_KEY` to simulate a match
4. Watch points accumulate on the global leaderboard
5. Sync points to chain via the dashboard
6. Claim a prize tier when eligible

---

## 9. Running Tests

### Contracts
```bash
cd packages/contracts
pnpm test                 # Hardhat + Chai
pnpm coverage             # coverage report
pnpm lint                 # solhint + prettier check
pnpm slither              # if Slither installed globally
```

### Frontend / API
```bash
cd apps/web
pnpm test                 # Vitest unit tests
pnpm test:e2e             # Playwright end-to-end (if configured)
pnpm lint
pnpm typecheck
```

---

## Common Issues

### "Insufficient funds for gas"
You're out of testnet WIRE. Visit `https://faucet.wirefluid.com` again. Rate-limited per address.

### "Nonce too low" during deploy
Your deployer wallet has a stuck pending tx. In MetaMask: Settings → Advanced → Clear activity tab data.

### "Invalid signature" when syncing
- Confirm `SIGNER_PRIVATE_KEY` in `.env.local` matches the address used when deploying `PSLPoints` (the `trustedSigner` constructor arg).
- If they don't match, you'll need to redeploy with the correct signer address.

### Drizzle schema changes not applying
```bash
pnpm db:push --force       # overwrite without prompting
```
or drop the database and re-seed:
```bash
pnpm db:reset && pnpm db:seed
```

### Wallet won't connect
- Confirm MetaMask is on WireFluid Testnet (chain ID 92533)
- Hard refresh the page
- Check browser console for WalletConnect errors

### `earnedBalance` shows 0 after sync
- The prize leaderboard snapshot refreshes lazily on read; trigger a fresh refresh by loading `GET /api/leaderboard/prize` directly (or visiting the `/leaderboard` page, which polls every 5s)
- Verify the `Synced` event appears on the explorer for your tx — if it's there but your rank isn't updating, the issue is in the refresh handler, not the contract
- Remember: you only appear on the prize leaderboard after your `earnedBalance` crosses 10,000 BNDY. Below that threshold, your wallet is correctly hidden by the backend filter.

---

## Project Scripts Cheat Sheet

```bash
pnpm dev                           # run Next.js dev server
pnpm build                         # build everything
pnpm lint                          # lint all packages
pnpm typecheck                     # typecheck all packages
pnpm test                          # run all tests

pnpm db:push                       # push schema to Neon
pnpm db:seed                       # seed players and prizes
pnpm db:studio                     # Drizzle Studio UI
pnpm db:reset                      # drop and recreate schema

pnpm --filter contracts test       # contract tests only
pnpm --filter contracts deploy:testnet   # redeploy contracts
pnpm --filter web dev              # frontend only
```
