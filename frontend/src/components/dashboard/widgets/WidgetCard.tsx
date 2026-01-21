import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function WidgetCard({ children, className }: Props) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}
