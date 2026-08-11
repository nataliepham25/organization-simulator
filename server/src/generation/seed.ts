import { randomUUID } from "node:crypto";
import type { NewEvent } from "../../../shared/src/types.js";
import { insertEvent } from "../db/events.js";
import { createOrganization } from "../db/organizations.js";

const ORG_NAME = "Crouton";
const FOUNDED_AT = "2024-10-07T00:00:00.000Z";
const FOUNDING_LOCATION = "Charlotte, NC";

function main(): void {
  const org = createOrganization({
    name: ORG_NAME,
    founded_at: FOUNDED_AT,
    location: FOUNDING_LOCATION,
  });

  const leadershipTeamId = randomUUID();
  const engineeringTeamId = randomUUID();
  const designTeamId = randomUUID();
  const gtmTeamId = randomUUID();

  const adamId = randomUUID();
  const samId = randomUUID();
  const jordanId = randomUUID();
  const brenoId = randomUUID();
  const griffinId = randomUUID();

  // Chronological by design — insertEvent assigns sequence in call order, so
  // this array IS the log order, not just narrative order.
  const seedEvents: Omit<NewEvent, "org_id">[] = [
    {
      type: "OrgFounded",
      occurred_at: FOUNDED_AT,
      payload: { founder_name: "Adam", location: FOUNDING_LOCATION },
    },
    {
      type: "TeamCreated",
      occurred_at: "2024-10-14T00:00:00.000Z",
      payload: { team_id: leadershipTeamId, name: "Leadership" },
    },
    {
      type: "TeamCreated",
      occurred_at: "2024-10-14T00:00:00.000Z",
      payload: {
        team_id: engineeringTeamId,
        name: "Engineering",
        parent_team_id: leadershipTeamId,
      },
    },
    {
      type: "PersonJoined",
      occurred_at: "2024-10-14T00:00:00.000Z",
      payload: {
        person_id: adamId,
        name: "Adam",
        role: "CEO",
        team_id: leadershipTeamId,
        employment_type: "full_time",
      },
    },
    {
      type: "PersonJoined",
      occurred_at: "2024-10-21T00:00:00.000Z",
      payload: {
        person_id: samId,
        name: "Sam Ortiz",
        role: "Software Engineer",
        team_id: engineeringTeamId,
        employment_type: "full_time",
      },
    },
    // Hand-picked filler so the log has variety before random generation
    // takes over: a second early engineer, a promotion, a departure.
    {
      type: "PersonJoined",
      occurred_at: "2024-12-09T00:00:00.000Z",
      payload: {
        person_id: jordanId,
        name: "Jordan Lee",
        role: "Software Engineer",
        team_id: engineeringTeamId,
        employment_type: "full_time",
      },
    },
    {
      type: "PersonPromoted",
      occurred_at: "2025-04-02T00:00:00.000Z",
      payload: {
        person_id: samId,
        old_role: "Software Engineer",
        new_role: "Senior Software Engineer",
      },
    },
    {
      type: "PersonLeft",
      occurred_at: "2025-07-18T00:00:00.000Z",
      payload: { person_id: jordanId, reason: "pursued another opportunity" },
    },
    {
      type: "OrgRelocated",
      occurred_at: "2026-02-02T00:00:00.000Z",
      payload: { from: "Charlotte, NC", to: "New York, NY" },
    },
    {
      type: "TeamCreated",
      occurred_at: "2026-05-04T00:00:00.000Z",
      payload: {
        team_id: designTeamId,
        name: "Design",
        parent_team_id: leadershipTeamId,
      },
    },
    {
      type: "PersonJoined",
      occurred_at: "2026-05-04T00:00:00.000Z",
      payload: {
        person_id: brenoId,
        name: "Breno",
        role: "Founding Designer",
        team_id: designTeamId,
        employment_type: "full_time",
      },
    },
    {
      type: "TeamCreated",
      occurred_at: "2026-06-08T00:00:00.000Z",
      payload: {
        team_id: gtmTeamId,
        name: "GTM",
        parent_team_id: leadershipTeamId,
      },
    },
    {
      type: "PersonJoined",
      occurred_at: "2026-06-08T00:00:00.000Z",
      payload: {
        person_id: griffinId,
        name: "Griffin",
        role: "Growth Strategist",
        team_id: gtmTeamId,
        employment_type: "part_time",
      },
    },
  ];

  for (const event of seedEvents) {
    insertEvent({ org_id: org.id, ...event } as NewEvent);
  }

  console.log(`Created organization ${org.name} (${org.id})`);
  console.log(`Inserted ${seedEvents.length} hand-authored events.`);
  console.log(org.id);
}

main();
