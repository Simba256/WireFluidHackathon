# @boundaryline/db

Drizzle ORM schema, migrations, and seed data for BoundaryLine's Postgres database.

## Layout

```
src/
├── index.ts         Exports db client, schema, helpers
├── schema.ts        Drizzle table definitions
└── client.ts        Neon/postgres-js connection
drizzle/             Generated SQL migrations
seed/
├── index.ts         Seed runner
├── players.ts       Load PSL 2026 squads from data/psl-2026-players.json
├── prizes.ts        Seed prize tier rows
└── tournament.ts    Seed initial tournament row
```

See [`../../docs/DATA_MODEL.md`](../../docs/DATA_MODEL.md) for the schema reference.

## Scripts

```bash
pnpm generate    # create a migration from schema.ts diff
pnpm push        # push schema directly to DB (dev)
pnpm migrate     # apply committed migrations (prod)
pnpm studio      # open Drizzle Studio UI
pnpm seed        # load players, prizes, tournament
```
