import type { ReactNode } from "react";

interface WidgetFrameProps {
  title: string;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
}

export default function WidgetFrame({
  title,
  loading = false,
  error = null,
  children,
}: WidgetFrameProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-700">{title}</h3>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && children}
    </div>
  );
}
