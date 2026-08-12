# Organization Simulator

A simulated work system — the kind of thing a product like Crouton would sync
with — built around one idea: **nothing about the org is stored as current
state.** There's an append-only log of events, and everything else (who's on
which team, who the CEO is, what the org looked like six months ago) is
computed by replaying that log, never stored directly.

## Architecture, briefly

- **Event-sourced.** The only thing persisted is an immutable, ordered log of
  events per organization (`OrgFounded`, `PersonJoined`, `PersonPromoted`,
  etc.). There is no `people` or `teams` table.
- **Append-only.** Events are never edited or deleted. Each event gets a
  `sequence` number that's unique and strictly increasing per organization,
  enforced at the database level, not just by convention.
- **State is derived by replay.** A single reducer (`applyEvent`, in
  `server/src/replay/state.ts`) folds over the event log to produce state —
  "current state" and "state as of any past date" are the same function,
  just given a different slice of the log. Nothing caches or snapshots state
  anywhere; every request replays from scratch.
- **Monorepo, three workspaces:** `server/` (Express + SQLite via
  better-sqlite3), `client/` (React + Vite), `shared/` (TypeScript types both
  sides import, so the API contract can't drift silently out of sync).

## Running locally

Requires Node 20+ and npm.

```bash
# From the repo root
npm install

# Create the org and its hand-authored founding history.
# Prints the new org's id — you don't need it for normal use (the app only
# ever shows one org), but the CLI simulate script below takes it.
npm run seed -w server

# Starts the API server (:3001) and the Vite client (:5173) together
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

> **Re-running `npm run seed`?** It doesn't reset anything — it inserts a
> *second* organization, which the app will silently ignore (it always shows
> whichever org was created first). To start over, stop the dev server and
> delete `server/data/org-sim.sqlite*`, then reseed.

### Generating more history

The seed script only creates ~13 hand-authored events (founding, initial
hires, the relocation, a couple of later hires). Two ways to generate more:

- **From the UI:** click **"Simulate next sync"** — generates one more
  simulated month and appends it to the log immediately, no page reload.
- **From the CLI**, for a bigger batch at once:
  ```bash
  npm run simulate -w server <org_id> [monthsToSimulate] [seed]
  # e.g. npm run simulate -w server 4f1bf60a-... 24 42
  ```
  `monthsToSimulate` defaults to 24, `seed` to a fixed default — both optional.

Either way, generation respects the same guardrails: hire rate follows a
growth curve, unique roles (like CEO) can only be held by one active person,
nothing acts on someone who's already left, and hires only land on teams
that already exist. See `server/src/generation/constants.ts` for every
probability and threshold, all named.

### Other scripts

| Command | What it does |
|---|---|
| `npm run dev -w server` | API server only, with auto-reload |
| `npm run dev -w client` | Client only |
| `npm run db:migrate -w server` | Applies the schema explicitly (normally automatic on connect) |
| `npm run build` | Type-checked production build of both workspaces |

## API

The app only ever operates on one organization — there's no `org_id` in any
request; the server always resolves "the" org itself.

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness check; also confirms SQLite is reachable |
| `GET /api/events?since=<sequence>` | Events with `sequence` greater than the given value, ordered ascending. Omit `since` for the whole log — this is the incremental-sync endpoint an external system like Crouton would poll |
| `POST /api/events/generate-tick` | Generates and persists one more simulated month, returning only the events that call created |
| `GET /api/org-state?asOf=<date>` | Org info, teams, and each team's currently-active people, replayed as of a calendar date |
| `GET /api/org-state?upToSequence=<sequence>` | Same, but replayed up through an exact event — precise when several events share a date, which `asOf` can't distinguish |

## Event schema

Every event has `id`, `org_id`, `sequence`, `type`, `occurred_at`, and a
`payload` whose shape depends on `type`:

| `type` | `payload` fields | Meaning |
|---|---|---|
| `OrgFounded` | `founder_name`, `location` | The org's founding — always sequence 1 |
| `OrgRelocated` | `from`, `to` | The org's location changed |
| `TeamCreated` | `team_id`, `name`, `parent_team_id?` | A new team, optionally nested under an existing one |
| `PersonJoined` | `person_id`, `name`, `role`, `team_id`, `employment_type` | A hire. `employment_type` is `full_time`, `part_time`, or `contractor` |
| `PersonLeft` | `person_id`, `reason?` | A departure |
| `PersonPromoted` | `person_id`, `old_role`, `new_role` | A role change |
| `TeamTransferred` | `person_id`, `from_team_id`, `to_team_id` | A move between existing teams |
| `ManagerChanged` | `person_id`, `old_manager_id`, `new_manager_id` | A reporting-line change |

The full TypeScript definitions (and the discriminated union that ties
`type` to the right `payload` shape) live in `shared/src/types.ts`.
