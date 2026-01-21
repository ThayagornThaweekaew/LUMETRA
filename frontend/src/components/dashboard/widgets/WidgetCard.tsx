import React from "react";

type Props = {
  title?: string;
  onRemove?: () => void;
  children: React.ReactNode;
};

export default function WidgetCard({ title, onRemove, children }: Props) {
  return (
    <div className="h-full rounded-xl border bg-white shadow-sm">
      {/* header = drag handle */}
      <div className="widget-drag-handle flex items-center justify-between border-b px-4 py-3 cursor-move">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
          {title ?? "Widget"}
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Remove
          </button>
        )}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}
