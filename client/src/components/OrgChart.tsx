import { useEffect, useState } from "react";
import type { OrgEvent, OrgStateProjection } from "../../../shared/src/types.js";
import { avatarColor, initials } from "../lib/avatar.js";
import { fetchOrgState } from "../lib/api.js";

interface OrgChartProps {
  events: OrgEvent[];
}

const DEBOUNCE_MS = 120;

function OrgChart({ events }: OrgChartProps) {
  // The scrubber steps through actual event checkpoints (not arbitrary
  // calendar days) so every position corresponds to a real change in the
  // log — dragging always visibly moves something, rather than landing on
  // long stretches of days where nothing happened.
  const [sliderIndex, setSliderIndex] = useState(Math.max(events.length - 1, 0));
  const [orgState, setOrgState] = useState<OrgStateProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSliderIndex(Math.max(events.length - 1, 0));
  }, [events.length]);

  const selectedEvent = events[sliderIndex];

  useEffect(() => {
    if (!selectedEvent) return;
    setLoading(true);
    const timeout = setTimeout(() => {
      fetchOrgState(selectedEvent.occurred_at)
        .then((data) => {
          setOrgState(data);
          setError(null);
        })
        .catch((err: unknown) => setError(String(err)))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [selectedEvent]);

  if (events.length === 0 || !selectedEvent) {
    return (
      <div className="card">
        <div className="state-message">No events yet.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="scrubber">
        <div className="scrubber-top">
          <div className="scrubber-date">{selectedEvent.occurred_at.slice(0, 10)}</div>
          <div className="scrubber-event">
            after #{String(selectedEvent.sequence).padStart(3, "0")} — {selectedEvent.type}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={events.length - 1}
          value={sliderIndex}
          onChange={(e) => setSliderIndex(Number(e.target.value))}
        />
        <div className="scrubber-bounds">
          <span>{events[0]!.occurred_at.slice(0, 10)}</span>
          <span>{events[events.length - 1]!.occurred_at.slice(0, 10)}</span>
        </div>
      </div>

      <div className="org-meta">
        {orgState ? (
          <>
            <b>{orgState.org.name}</b> · {orgState.org.location}
          </>
        ) : (
          "Loading org state..."
        )}
      </div>

      {error && <div className="state-message is-error">Failed to load org state: {error}</div>}

      {orgState && !error && orgState.teams.length === 0 && (
        <div className="state-message">No teams exist yet at this point in the org's history.</div>
      )}

      {orgState && !error && orgState.teams.length > 0 && (
        <div className="teams" style={{ opacity: loading ? 0.5 : 1 }}>
          {orgState.teams.map((team) => (
            <div className="team-card" key={team.id}>
              <div className="team-card-head">
                <span className="team-card-name">{team.name}</span>
                <span className="team-card-count">{team.people.length}</span>
              </div>
              {team.people.length === 0 ? (
                <div className="team-empty">no active members</div>
              ) : (
                team.people.map((person) => (
                  <div className="person-row" key={person.id}>
                    <div className="avatar" style={{ background: avatarColor(person.name) }}>
                      {initials(person.name)}
                    </div>
                    <div className="person-info">
                      <div className="person-name">{person.name}</div>
                      <div className="person-role">{person.role}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrgChart;
