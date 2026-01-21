export interface WeeklyUser {
  day: string
  users: number
}

export async function fetchWeeklyUsers(): Promise<WeeklyUser[]> {
  const res = await fetch("http://localhost:8080/api/weekly-users")
  if (!res.ok) {
    throw new Error("Failed to fetch weekly users")
  }
  return res.json()
}
