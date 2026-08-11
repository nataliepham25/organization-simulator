import { useEffect, useState } from "react";
import type { HealthCheckResponse } from "../../shared/src/types.js";

function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthCheckResponse) => setHealth(data))
      .catch((err: unknown) => setError(String(err)));
  }, []);

  return (
    <main>
      <h1>Organization Simulator</h1>
      {error && <p>Failed to reach server: {error}</p>}
      {!error && !health && <p>Checking server...</p>}
      {health && (
        <p>
          Server status: {health.status} (as of {health.timestamp})
        </p>
      )}
    </main>
  );
}

export default App;
