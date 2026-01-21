type Props = {
  title: string;
  loading?: boolean;
  error?: string | null;
  right?: React.ReactNode; // เผื่อปุ่ม/เมนูอนาคต
  children: React.ReactNode;
};

export default function WidgetFrame({
  title,
  loading,
  error,
  right,
  children,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        {right}
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-lg bg-gray-100" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
