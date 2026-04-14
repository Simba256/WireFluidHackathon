# @boundaryline/web

Next.js 15 App Router application — frontend + API routes for BoundaryLine.

## Structure

```
app/
├── (marketing)/      Public landing, about, how it works
├── (app)/            Authenticated DApp routes
│   ├── play/         Team picker (select 11 players)
│   ├── dashboard/    My points, sync button, stats
│   ├── leaderboard/  Global + prize leaderboard tabs
│   ├── prizes/       Tier cards + claim flow
│   └── trophies/     Won trophy NFTs
├── admin/            Protected admin panel (match scoring)
└── api/              Route handlers (backend)
    ├── auth/         SIWE nonce + verify
    ├── teams/        Team CRUD
    ├── players/      Player catalog
    ├── points/       User point totals
    ├── sync/         Sync voucher signing
    ├── claim/        Claim voucher signing
    ├── leaderboard/  Global + prize reads
    ├── prizes/       Tier catalog
    ├── trophies/     User trophies
    └── admin/        Admin-only operations

components/
├── ui/               shadcn-style primitives
├── wallet/           Connect button, chain guard, SIWE flow
├── team/             Player card, team grid
└── leaderboard/      Row, tabs, rank change animations

lib/                  Server helpers, auth, signers, chain config
hooks/                Client hooks (wagmi wrappers)
public/               Static assets (player photos, prize images)
styles/               Tailwind globals
```

See [`../../docs/`](../../docs) for the full project documentation.

