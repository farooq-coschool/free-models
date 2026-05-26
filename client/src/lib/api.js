const BASE = "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  models: () => request("/api/models"),
  benchmarks: () => request("/api/benchmarks"),
  runs: () => request("/api/runs"),
  run: (payload) => request("/api/run", { method: "POST", body: JSON.stringify(payload) }),
  evaluate: (payload) => request("/api/evaluate", { method: "POST", body: JSON.stringify(payload) }),
  routerTest: (payload) => request("/api/router/test", { method: "POST", body: JSON.stringify(payload) }),
  runById: (id) => request(`/api/runs/${id}`)
};
