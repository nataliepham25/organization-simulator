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

export async function fetchOrgState(asOf?: string): Promise<OrgStateProjection> {
  const url =
    asOf === undefined ? "/api/org-state" : `/api/org-state?asOf=${encodeURIComponent(asOf)}`;
  const res = await fetch(url);
  return parseJsonOrThrow<OrgStateProjection>(res);
}
