import { useEffect, useState } from "react";
import WidgetFrame from "./WidgetFrame";
import { fetchKPI } from "../../../services/kpi";
import type { KPIResponse } from "../../../services/kpi";

export default function KPIWidget() {
  const [data, setData] = useState<KPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  console.log("📊 KPIWidget rendered");

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchKPI();
        if (!isMounted) return;
        setData(res);
      } catch {
        if (!isMounted) return;
        setError("Cannot load KPI");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <WidgetFrame title="KPI Summary" loading={loading} error={error}>
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Total Users</div>
            <div className="mt-1 text-xl font-semibold">
              {data.total_users.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Active Sessions</div>
            <div className="mt-1 text-xl font-semibold">
              {data.active_sessions.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Accuracy</div>
            <div className="mt-1 text-xl font-semibold">{data.accuracy}%</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Latency</div>
            <div className="mt-1 text-xl font-semibold">{data.latency_ms} ms</div>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
