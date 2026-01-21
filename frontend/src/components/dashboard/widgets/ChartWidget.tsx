import { useEffect, useState } from "react";
import WidgetFrame from "./WidgetFrame";
import UserLineChart from "../../charts/UserLineChart";
import { fetchWeeklyUsers } from "../../../services/weeklyUsers";
import type { WeeklyUser } from "../../../services/weeklyUsers";

export type ChartWidgetConfig = {
  range: "7d" | "30d" | "90d";
};

export default function ChartWidget({ config }: { config?: ChartWidgetConfig }) {
  const [data, setData] = useState<WeeklyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = config?.range ?? "7d";

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchWeeklyUsers(range);
        if (!alive) return;
        setData(res);
      } catch {
        if (!alive) return;
        setError("Cannot load users chart");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [range]);

  return (
    <WidgetFrame title={`Weekly Active Users (${range})`} loading={loading} error={error}>
      <UserLineChart data={data} />
    </WidgetFrame>
  );
}
