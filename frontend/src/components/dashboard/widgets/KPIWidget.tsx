import { useEffect, useMemo, useState } from "react";
import WidgetFrame from "./WidgetFrame";
import { fetchKPI } from "../../../services/kpi";
import type { KPIResponse } from "../../../services/kpi";

export type KPIMetricKey = "total_users" | "active_sessions" | "accuracy" | "latency_ms";
export type KPIWidgetConfig = {
  mode: "all" | "single";
  metric?: KPIMetricKey;
};

export default function KPIWidget({ config }: { config?: KPIWidgetConfig }) {
  const [data, setData] = useState<KPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchKPI();
        if (!alive) return;
        setData(res);
      } catch {
        if (!alive) return;
        setError("Cannot load KPI");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const mode = config?.mode ?? "all";
  const metric = config?.metric ?? "total_users";

  const cards = useMemo(() => {
    if (!data) return [];

    const all = [
      { key: "total_users" as const, label: "Total Users", value: data.total_users.toLocaleString() },
      { key: "active_sessions" as const, label: "Active Sessions", value: data.active_sessions.toLocaleString() },
      { key: "accuracy" as const, label: "Prediction Accuracy", value: `${data.accuracy}%` },
      { key: "latency_ms" as const, label: "Latency", value: `${data.latency_ms} ms` },
    ];

    if (mode === "all") return all;
    return all.filter((c) => c.key === metric);
  }, [data, mode, metric]);

  return (
    <WidgetFrame title="KPI Summary" loading={loading} error={error}>
      {cards.length > 0 && (
        <div className={cards.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-3"}>
          {cards.map((c) => (
            <div key={c.key} className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{c.label}</div>
              <div className="mt-1 text-xl font-semibold">{c.value}</div>
            </div>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}
