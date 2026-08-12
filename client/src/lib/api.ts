import type {
  ApiErrorResponse,
  EventsResponse,
  OrgEvent,
  OrgStateProjection,
} from "../../../shared/src/types.js";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T | ApiErrorResponse;
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? body.error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

// Both views go through these two functions and nothing else — neither
// maintains its own copy of "what happened"; they always ask the server,
// which always derives the answer from the event log.

export async function fetchEvents(since?: number): Promise<OrgEvent[]> {
  const url = since === undefined ? "/api/events" : `/api/events?since=${since}`;
  const res = await fetch(url);
  const body = await parseJsonOrThrow<EventsResponse>(res);
  return body.events;
}

export interface FetchOrgStateParams {
  // Prefer upToSequence when a specific event is known — it's exact, unlike
  // asOf, which can't distinguish between events sharing the same date.
  upToSequence?: number;
  asOf?: string;
}

export async function fetchOrgState(params: FetchOrgStateParams = {}): Promise<OrgStateProjection> {
  const search = new URLSearchParams();
  if (params.upToSequence !== undefined) {
    search.set("upToSequence", String(params.upToSequence));
  } else if (params.asOf !== undefined) {
    search.set("asOf", params.asOf);
  }
  const qs = search.toString();
  const res = await fetch(`/api/org-state${qs ? `?${qs}` : ""}`);
  return parseJsonOrThrow<OrgStateProjection>(res);
}
