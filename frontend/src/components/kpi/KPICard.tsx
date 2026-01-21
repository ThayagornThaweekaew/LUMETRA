type Props = {
  title: string;
  value: string;
  trend?: "up" | "down";
};

export default function KPICard({ title, value, trend }: Props) {
  return (
    <div className="rounded-xl bg-white p-5 shadow hover:shadow-lg transition">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <span
            className={`text-sm font-semibold ${
              trend === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>
    </div>
  );
}
