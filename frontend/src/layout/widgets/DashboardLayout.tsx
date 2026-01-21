import { useEffect, useMemo, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { ReactNode } from "react";



import WidgetCard from "../../components/dashboard/widgets/WidgetCard";
import WidgetFrame from "../../components/dashboard/widgets/WidgetFrame";
import KPIWidget from "../../components/dashboard/widgets/KPIWidget";
import ChartWidget from "../../components/dashboard/widgets/ChartWidget";

const ResponsiveGridLayout = WidthProvider(Responsive);
type Props = { children: ReactNode };

export default function WidgetCard({ children }: Props) {
  return <div className="rounded-xl border bg-white p-4 shadow-sm">{children}</div>;
}

type WidgetType = "kpi" | "chart";
type WidgetDef = { id: string; type: WidgetType; config: any };

const DASHBOARD_ID = "default";

// ✅ ค่าเริ่มต้น
const DEFAULT_WIDGETS: WidgetDef[] = [
  { id: "kpi-1", type: "kpi", config: { mode: "all" } },
  { id: "chart-1", type: "chart", config: { range: "7d" } },
];

function makeId(type: WidgetType) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${type}-${crypto.randomUUID()}`;
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeLayoutsFromWidgets(widgets: WidgetDef[]): Layouts {
  const lg: Layout[] = widgets.map((w, idx) => ({
    i: w.id,
    x: (idx % 2) * 6,
    y: Math.floor(idx / 2) * 10,
    w: 6,
    h: w.type === "chart" ? 10 : 6,
    minW: 4,
    minH: 4,
  }));

  return {
    lg,
    md: lg.map((it) => ({ ...it, w: Math.min(it.w, 10), x: Math.min(it.x, 4) })),
    sm: lg.map((it, idx) => ({ ...it, x: 0, y: idx * 10, w: 6 })),
    xs: lg.map((it, idx) => ({ ...it, x: 0, y: idx * 10, w: 4 })),
  };
}

function normalizeWidgets(raw: any): WidgetDef[] {
  const arr = Array.isArray(raw) ? raw : [];
  const normalized: WidgetDef[] = arr.map((w: any, idx: number) => {
    // รองรับแบบเก่า: ["kpi","chart"]
    if (typeof w === "string") return { id: `${w}-${idx}`, type: w as WidgetType, config: {} };
    // แบบใหม่: {id,type,config}
    return {
      id: String(w.id ?? `${w.type ?? "widget"}-${idx}`),
      type: (w.type ?? "kpi") as WidgetType,
      config: w.config ?? {},
    };
  });

  return normalized.length ? normalized : DEFAULT_WIDGETS;
}

export default function DashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // settings state (ยังไม่ทำ modal จริง แค่ไว้ต่อได้)
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);

  const widgetMap = useMemo(() => {
    const m = new Map<string, WidgetDef>();
    widgets.forEach((w) => m.set(w.id, w));
    return m;
  }, [widgets]);

  // ✅ Load: MongoDB -> fallback localStorage -> fallback default
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/layout/${DASHBOARD_ID}`);
        if (!res.ok) throw new Error("load failed");
        const data: any = await res.json();

        const normalizedWidgets = normalizeWidgets(data.widgets);
        const loadedLayouts: Layouts = data.layouts ?? {};

        const ensureLayouts =
          loadedLayouts?.lg || loadedLayouts?.md || loadedLayouts?.sm || loadedLayouts?.xs
            ? loadedLayouts
            : makeLayoutsFromWidgets(normalizedWidgets);

        setWidgets(normalizedWidgets);
        setLayouts(ensureLayouts);
      } catch {
        const saved = localStorage.getItem("dashboard-layout-v2");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const normalizedWidgets = normalizeWidgets(parsed.widgets);
            const ensureLayouts: Layouts =
              parsed.layouts?.lg || parsed.layouts?.md || parsed.layouts?.sm || parsed.layouts?.xs
                ? parsed.layouts
                : makeLayoutsFromWidgets(normalizedWidgets);

            setWidgets(normalizedWidgets);
            setLayouts(ensureLayouts);
          } catch {
            setWidgets(DEFAULT_WIDGETS);
            setLayouts(makeLayoutsFromWidgets(DEFAULT_WIDGETS));
          }
        } else {
          setWidgets(DEFAULT_WIDGETS);
          setLayouts(makeLayoutsFromWidgets(DEFAULT_WIDGETS));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Autosave (debounce): MongoDB + localStorage
  useEffect(() => {
    if (loading) return;

    const t = setTimeout(async () => {
      try {
        setSaving(true);
        await fetch(`http://localhost:8080/api/layout/${DASHBOARD_ID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widgets, layouts }),
        });
        localStorage.setItem("dashboard-layout-v2", JSON.stringify({ widgets, layouts }));
      } catch {
        // offline fallback
        localStorage.setItem("dashboard-layout-v2", JSON.stringify({ widgets, layouts }));
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [widgets, layouts, loading]);

  const addWidget = (type: WidgetType) => {
    const id = makeId(type);
    const newWidget: WidgetDef =
      type === "chart"
        ? { id, type, config: { range: "7d" } }
        : { id, type, config: { mode: "all" } };

    setWidgets((prev) => [...prev, newWidget]);

    // เพิ่ม layout ทุก breakpoint (y: Infinity ให้ลงท้าย)
    setLayouts((prev) => {
      const next: Layouts = { ...prev };

      const add = (bp: keyof Layouts, cols: number) => {
        const arr = Array.isArray(next[bp]) ? ([...(next[bp] as Layout[])] as Layout[]) : ([] as Layout[]);
        arr.push({
          i: id,
          x: 0,
          y: Infinity,
          w: Math.min(6, cols),
          h: type === "chart" ? 10 : 6,
          minW: 4,
          minH: 4,
        });
        next[bp] = arr as any;
      };

      add("lg", 12);
      add("md", 10);
      add("sm", 6);
      add("xs", 4);
      return next;
    });
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayouts((prev) => {
      const next: Layouts = {};
      for (const k of Object.keys(prev)) {
        const arr = (prev as any)[k] ?? [];
        (next as any)[k] = arr.filter((it: any) => it.i !== id);
      }
      return next;
    });
  };

  const openSettings = (id: string) => {
    setActiveSettingsId(id);
    console.log("⚙ open settings for", id);
    // ต่อ modal จริงได้ทีหลัง
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  return (
    // ✅ ทำให้ canvas กว้างเต็มจอ
    <div className="w-full min-h-screen px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Builder</h1>
          <p className="text-sm text-gray-500">ลากวางอิสระ + ย่อ/ขยายได้ • autosave MongoDB</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="mr-3 text-sm text-gray-500">{saving ? "Saving..." : "Saved"}</div>

          <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addWidget("kpi")}>
            + Add KPI
          </button>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addWidget("chart")}>
            + Add Chart
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={30}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable
          isResizable
          compactType={null} // ✅ วางอิสระ
          preventCollision={false}
          draggableHandle=".widget-drag-handle" // ✅ ลากเฉพาะหัวการ์ด
          onLayoutChange={(_, all) => setLayouts(all)}
        >
          {widgets.map((w) => {
            const widget = widgetMap.get(w.id);
            if (!widget) return null;

            return (
              <div key={w.id}>
                <WidgetCard>
                  {/* Header ของการ์ด */}
                  <div className="mb-2 flex items-center justify-between">
                    {/* ✅ ปุ่ม settings อยู่ซ้ายหลังชื่อ */}
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-gray-500 hover:text-gray-900"
                        onClick={() => openSettings(widget.id)}
                        title="Settings"
                        aria-label="Settings"
                        type="button"
                      >
                        ⚙
                      </button>

                      <div className="widget-drag-handle cursor-move select-none text-sm font-medium text-gray-700">
                        {widget.type === "kpi" ? "KPI Widget" : "Chart Widget"}
                      </div>
                    </div>

                    <button
                      className="text-xs text-gray-500 hover:text-red-600"
                      onClick={() => removeWidget(widget.id)}
                      title="Remove"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>

                  <WidgetFrame title={widget.type === "kpi" ? "KPI Summary" : "Weekly Active Users"}>
                    {widget.type === "kpi" && <KPIWidget />}
                    {widget.type === "chart" && <ChartWidget />}
                  </WidgetFrame>
                </WidgetCard>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      {/* ยังไม่ทำ modal จริง */}
      {activeSettingsId ? null : null}
    </div>
  );
}
