export interface KPIResponse {
  total_users: number
  active_sessions: number
  accuracy: number
  latency_ms: number
}

export async function fetchKPI(): Promise<KPIResponse> {
  const res = await fetch("http://localhost:8080/api/kpi")
  if (!res.ok) {
    throw new Error("Failed to fetch KPI")
  }
  return res.json()
}
