import { useMemo } from "react";
import type { OrgEvent } from "../../../shared/src/types.js";
import { buildEventContext, categoryFor, CATEGORY_SYMBOL, describeEvent } from "../lib/describeEvent.js";

interface TimelineProps {
  events: OrgEvent[];
}

function Timeline({ events }: TimelineProps) {
  const ctx = useMemo(() => buildEventContext(events), [events]);

  if (events.length === 0) {
    return (
      <div className="card">
        <div className="state-message">No events yet.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="label">Event log — append only</div>
        <div className="desc">
          Every change to the org, in the order it happened. This is the source of truth.
        </div>
      </div>
      <div>
        {events.map((event) => {
          const category = categoryFor(event);
          return (
            <div className="log-row" key={event.id}>
              <div className="log-seq">#{String(event.sequence).padStart(3, "0")}</div>
              <div className={`log-marker ${category}`}>{CATEGORY_SYMBOL[category]}</div>
              <div className="log-date">{event.occurred_at.slice(0, 10)}</div>
              <div className="log-desc">
                <span className="type">{event.type}</span>
                <span className="text">{describeEvent(event, ctx)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;
