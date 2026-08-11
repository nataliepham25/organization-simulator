I'm building an "organization simulator" for a take-home assignment. Here's the
full context so you understand every decision below:

CONCEPT
This simulates a work system (like an HRIS) that Crouton would sync with. It's
event-sourced: nothing about the org is stored as "current state" directly.
Instead there's an immutable, append-only log of events, and current state (or
state as of any past date) is computed by replaying that log. This mirrors what
the real product does with real synced systems.

TECH STACK

- TypeScript throughout
- React frontend
- SQLite for storage (via better-sqlite3 or Drizzle ORM — your call, prefer
  whichever is faster to wire up cleanly)
- A small Express (or Next.js API routes) backend

DATA MODEL
Organization: id, name, founded_at, location

Event (append-only, never updated or deleted):
id, org_id, sequence (int, monotonic increasing, unique per org),
type (string), occurred_at (date), payload (json)

EVENT TYPES (payload shape for each)

- OrgFounded { founder_name, location }
- OrgRelocated { from, to }
- TeamCreated { team_id, name, parent_team_id? }
- PersonJoined { person_id, name, role, team_id, employment_type }
- PersonLeft { person_id, reason? }
- PersonPromoted { person_id, old_role, new_role }
- TeamTransferred { person_id, from_team_id, to_team_id }
- ManagerChanged { person_id, old_manager_id, new_manager_id }

Feel free to propose 1-2 additional playful event types beyond this list
(e.g. something like a funding round or an acquisition) — I want to show range
here, not just the minimum.

CONSTRAINTS THAT MATTER

- Strictly append-only / forward-moving. No editing or backdating past events.
- State must always be DERIVED by replaying events, never stored as a separate
  mutable table. A replay function like computeState(events, upToSequence)
  should be the single source of truth for both "current state" and "state as
  of date X."
- Event generation should use CONSTRAINED randomness, not pure randomness —
  guardrails like: only one person can hold a unique role (e.g. CEO) at a time,
  hire probability should roughly follow a growth curve over simulated time,
  no promoting/transferring someone who has already left, teams must exist
  before someone can join them.

DON'T build: auth, multi-org support, retroactive event editing, an
allocation/capacity data model. Keep scope tight.

I'll be giving you prompts phase by phase. After each phase, explain what you
built and why, in plain language, as if walking a teammate through it — I need
to be able to explain this system myself in a technical interview.
