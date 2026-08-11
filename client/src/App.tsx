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

  // Fetched once, here, and passed down — the Timeline renders it directly;
  // the Org Chart only reads dates/sequences off it to drive the scrubber.
  // Neither view derives org state from it themselves — that always comes
  // from /api/org-state.
  useEffect(() => {
    fetchEvents()
      .then((data) => {
        setEvents(data);
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

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

      {!loading && !error && (tab === "timeline" ? <Timeline events={events} /> : <OrgChart events={events} />)}

      <div className="app-footer">Backed by a live SQLite event log — no mock data.</div>
    </div>
  );
}

export default App;
