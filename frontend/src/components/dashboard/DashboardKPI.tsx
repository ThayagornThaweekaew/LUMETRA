import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const kpis = [
  {
    title: "Total Revenue",
    value: "฿128,430",
    change: "+12.5%",
    positive: true,
  },
  {
    title: "Active Users",
    value: "1,284",
    change: "+4.2%",
    positive: true,
  },
  {
    title: "Orders",
    value: "342",
    change: "-2.1%",
    positive: false,
  },
  {
    title: "Conversion Rate",
    value: "3.6%",
    change: "+0.4%",
    positive: true,
  },
];

export default function DashboardKPI() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {kpis.map((kpi) => (
        <Card
          key={kpi.title}
          className="bg-[#222] border border-white/10 rounded-2xl shadow-md"
        >
          <CardContent className="p-6">
            <p className="text-sm text-gray-400">{kpi.title}</p>
            <h2 className="text-2xl font-semibold text-[#E6C07B] mt-2">
              {kpi.value}
            </h2>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {kpi.positive ? (
                <ArrowUpRight className="w-4 h-4 text-green-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              )}
              <span
                className={
                  kpi.positive ? "text-green-400" : "text-red-400"
                }
              >
                {kpi.change}
              </span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
