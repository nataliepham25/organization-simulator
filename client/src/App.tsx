import { useEffect, useState } from "react";
import type { OrgEvent } from "../../shared/src/types.js";
import OrgChart from "./components/OrgChart.js";
import Timeline from "./components/Timeline.js";
import { fetchEvents } from "./lib/api.js";

type Tab = "timeline" | "orgchart";

function App() {
  const [tab, setTab] = useState<Tab>("timeline");
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The Org Chart's scrubber position, lifted up here (by sequence number,
  // not array index or date — see OrgChart.tsx) so Timeline can move it too.
  // Both interaction paths funnel into this one setter, which is what makes
  // "reuse the existing render" true: OrgChart has exactly one effect that
  // reacts to this value, regardless of who changed it.
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);

  // Fetched once, here, and passed down — the Timeline renders it directly;
  // the Org Chart only reads dates/sequences off it to drive the scrubber.
  // Neither view derives org state from it themselves — that always comes
  // from /api/org-state.
  useEffect(() => {
    fetchEvents()
      .then((data) => {
        setEvents(data);
        setSelectedSequence(data[data.length - 1]?.sequence ?? null);
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectEvent(event: OrgEvent): void {
    setSelectedSequence(event.sequence);
    setTab("orgchart");
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Organization Simulator</h1>
          <p className="app-subtitle">
            Org state is never stored directly — it's always derived by replaying the event log.
          </p>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${tab === "timeline" ? "active" : ""}`}
            onClick={() => setTab("timeline")}
          >
            Timeline
          </button>
          <button
            type="button"
            className={`tab ${tab === "orgchart" ? "active" : ""}`}
            onClick={() => setTab("orgchart")}
          >
            Org Chart
          </button>
        </div>
      </header>

      {loading && (
        <div className="card">
          <div className="state-message">Loading events...</div>
        </div>
      )}

      {!loading && error && (
        <div className="card">
          <div className="state-message is-error">Failed to load events: {error}</div>
        </div>
      )}

      {!loading && !error && (
        tab === "timeline" ? (
          <Timeline events={events} onSelectEvent={handleSelectEvent} />
        ) : (
          <OrgChart events={events} selectedSequence={selectedSequence} onScrub={setSelectedSequence} />
        )
      )}

      <div className="app-footer">Backed by a live SQLite event log — no mock data.</div>
    </div>
  );
}

export default App;
