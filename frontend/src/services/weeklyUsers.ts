export type WeeklyUser = { day: string; users: number };

export async function fetchWeeklyUsers(range?: string): Promise<WeeklyUser[]> {
  const qs = range ? `?range=${encodeURIComponent(range)}` : "";
  const res = await fetch(`http://localhost:8080/api/weekly-users${qs}`);
  if (!res.ok) throw new Error("Failed to fetch weekly users");
  return res.json();
}
