export async function loadLayout(userId = "demo"): Promise<any | null> {
  const res = await fetch(`http://localhost:8080/api/layout/${userId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to load layout")
  return res.json()
}

export async function saveLayout(userId = "demo", data: any): Promise<void> {
  const res = await fetch(`http://localhost:8080/api/layout/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to save layout")
}
