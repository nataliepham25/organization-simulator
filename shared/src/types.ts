// Types shared between server and client.
// This starts small on purpose — the event/org data model gets added in a later phase.

export interface HealthCheckResponse {
  status: "ok";
  timestamp: string;
}
