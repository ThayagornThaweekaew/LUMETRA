import { useEffect, useState } from "react";
import WidgetFrame from "./WidgetFrame";
import UserLineChart from "../../charts/UserLineChart";
import { fetchWeeklyUsers } from "../../../services/weeklyUsers";
import type { WeeklyUser } from "../../../services/weeklyUsers";

export default function ChartWidget() {
  const [data, setData] = useState<WeeklyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  console.log("📈 ChartWidget rendered");
  
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchWeeklyUsers();
        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setError("Cannot load weekly users");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <WidgetFrame title="Weekly Active Users" loading={loading} error={error}>
      <UserLineChart data={data} />
    </WidgetFrame>
  );
}
