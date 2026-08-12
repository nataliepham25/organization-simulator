import { useEffect, useState } from "react";
import type { OrgEvent } from "../../shared/src/types.js";
import OrgChart from "./components/OrgChart.js";
import Timeline from "./components/Timeline.js";
import { fetchEvents, generateTick } from "./lib/api.js";

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

  const [generating, setGenerating] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);

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

  // Appends whatever the endpoint created onto the same `events` array both
  // views already read from — no refetch of the whole log. Both views
  // re-render because they're already downstream of this one array: Timeline
  // gets new rows for free, and Org Chart is nudged to the new latest event
  // so the roster visibly reflects the tick rather than sitting on stale
  // data until someone happens to drag the scrubber.
  async function handleSimulateNextSync(): Promise<void> {
    setGenerating(true);
    setTickResult(null);
    try {
      const newEvents = await generateTick();
      if (newEvents.length > 0) {
        setEvents((prev) => [...prev, ...newEvents]);
        setSelectedSequence(newEvents[newEvents.length - 1]!.sequence);
      }
      setTickResult(
        newEvents.length === 0
          ? "Tick complete — no events this time."
          : `Tick complete — ${newEvents.length} new event${newEvents.length === 1 ? "" : "s"}.`,
      );
    } catch (err: unknown) {
      setTickResult(`Failed to generate tick: ${String(err)}`);
    } finally {
      setGenerating(false);
    }
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
        <div className="header-actions">
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
          <button
            type="button"
            className="simulate-button"
            onClick={handleSimulateNextSync}
            disabled={generating || loading}
          >
            {generating ? "Simulating..." : "Simulate next sync"}
          </button>
          {tickResult && <div className="tick-result">{tickResult}</div>}
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
