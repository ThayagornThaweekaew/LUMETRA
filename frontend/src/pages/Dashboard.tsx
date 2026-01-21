import { useEffect, useState } from "react";
import KPICard from "../components/kpi/KPICard";
import UserLineChart from "../components/charts/UserLineChart";
import { fetchKPI } from "../services/kpi";
import type { KPIResponse } from "../services/kpi";
import { fetchWeeklyUsers } from "../services/weeklyUsers";
import type { WeeklyUser } from "../services/weeklyUsers";

export default function Dashboard() {
  const [kpi, setKpi] = useState<KPIResponse | null>(null);
  const [weeklyUsers, setWeeklyUsers] = useState<WeeklyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [kpiData, weeklyData] = await Promise.all([
          fetchKPI(),
          fetchWeeklyUsers(),
        ]);

        if (!isMounted) return;

        setKpi(kpiData);
        setWeeklyUsers(weeklyData);
      } catch (err) {
        if (!isMounted) return;
        setError("Cannot load dashboard data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="p-6 text-red-500">
        {error ?? "No data available"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        Overview
      </h2>

      {/* KPI Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard
          title="Total Users"
          value={kpi.total_users.toLocaleString()}
        />
        <KPICard
          title="Active Sessions"
          value={kpi.active_sessions.toString()}
        />
        <KPICard
          title="Prediction Accuracy"
          value={`${kpi.accuracy}%`}
        />
        <KPICard
          title="Latency"
          value={`${kpi.latency_ms} ms`}
        />
      </div>

      {/* Chart Section */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-700">
          Weekly Active Users
        </h3>
        <UserLineChart data={weeklyUsers} />
      </div>
    </div>
  );
}
