import { useEffect, useState } from "react";
import {
  ResponsiveReactGridLayout,
  WidthProvider,
  type LayoutItem,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import WidgetCard from "../../components/dashboard/widgets/WidgetCard";
import KPIWidget, { type KPIWidgetConfig } from "../../components/dashboard/widgets/KPIWidget";
import ChartWidget, { type ChartWidgetConfig } from "../../components/dashboard/widgets/ChartWidget";
import WidgetSettingsModal, { Select } from "../../components/dashboard/widgets/WidgetSettingsModal";

const ResponsiveGridLayout = WidthProvider(ResponsiveReactGridLayout);

type WidgetType = "kpi" | "chart";
type WidgetConfig = KPIWidgetConfig | ChartWidgetConfig;

type WidgetDef = { id: string; type: WidgetType; config?: WidgetConfig };

// ✅ v4: เก็บ layouts แบบ responsive
const STORAGE_KEY_V4 = "dashboard-grid-v4";
const STORAGE_KEY_V3 = "dashboard-grid-v3"; // migrate จากของเดิม (widgets + layout เดียว)

const DEFAULT_WIDGETS: WidgetDef[] = [
  { id: "kpi-1", type: "kpi", config: { mode: "all" } },
  { id: "chart-1", type: "chart", config: { range: "7d" } },
];

function makeId(type: WidgetType) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${type}-${crypto.randomUUID()}`;
  }
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultLayoutFor(id: string, type: WidgetType, x: number): LayoutItem {
  if (type === "kpi") return { i: id, x, y: Infinity, w: 6, h: 6, minW: 3, minH: 4 };
  return { i: id, x, y: Infinity, w: 6, h: 9, minW: 4, minH: 6 };
}

function makeLayoutsFromWidgets(widgets: WidgetDef[]): ResponsiveLayouts {
  const lg: LayoutItem[] = widgets.map((w, idx) => {
    const x = idx % 2 === 0 ? 0 : 6;
    return defaultLayoutFor(w.id, w.type, x);
  });

  const md: LayoutItem[] = lg.map((l) => ({ ...l }));
  const sm: LayoutItem[] = widgets.map((w, idx) => ({
    i: w.id,
    x: 0,
    y: idx * 10,
    w: 12,
    h: w.type === "kpi" ? 6 : 9,
    minW: 12,
    minH: w.type === "kpi" ? 4 : 6,
  }));

  const xs: LayoutItem[] = sm.map((l) => ({ ...l }));

  return { lg, md, sm, xs };
}

export default function DashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>({ lg: [], md: [], sm: [], xs: [] });

  // settings modal
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const current = settingsId ? widgets.find((w) => w.id === settingsId) ?? null : null;

  // ✅ load + migrate
  useEffect(() => {
    const savedV4 = localStorage.getItem(STORAGE_KEY_V4);
    if (savedV4) {
      try {
        const parsed = JSON.parse(savedV4);
        if (
          parsed &&
          Array.isArray(parsed.widgets) &&
          parsed.widgets.every(
            (x: any) =>
              x &&
              typeof x.id === "string" &&
              (x.type === "kpi" || x.type === "chart")
          ) &&
          parsed.layouts
        ) {
          // ✅ เติม default config ถ้าไฟล์เก่าไม่มี
          const loadedWidgets: WidgetDef[] = parsed.widgets.map((w: any) => ({
            id: w.id,
            type: w.type,
            config:
              w.config ??
              (w.type === "kpi" ? { mode: "all" } : { range: "7d" }),
          }));

          setWidgets(loadedWidgets);
          setLayouts(parsed.layouts);
          return;
        }
      } catch {}
    }

    const savedV3 = localStorage.getItem(STORAGE_KEY_V3);
    if (savedV3) {
      try {
        const parsed = JSON.parse(savedV3);
        if (
          parsed &&
          Array.isArray(parsed.widgets) &&
          Array.isArray(parsed.layout) &&
          parsed.widgets.every(
            (x: any) =>
              x && typeof x.id === "string" && (x.type === "kpi" || x.type === "chart")
          )
        ) {
          const migratedWidgets: WidgetDef[] = parsed.widgets.map((w: any) => ({
            id: w.id,
            type: w.type,
            config: w.type === "kpi" ? { mode: "all" } : { range: "7d" },
          }));

          setWidgets(migratedWidgets);

          const lg = parsed.layout as LayoutItem[];
          const md = lg.map((l: LayoutItem) => ({ ...l }));
          const sm: LayoutItem[] = migratedWidgets.map((w: WidgetDef, idx: number) => ({
            i: w.id,
            x: 0,
            y: idx * 10,
            w: 12,
            h: w.type === "kpi" ? 6 : 9,
          }));
          const xs = sm.map((l: LayoutItem) => ({ ...l }));
          setLayouts({ lg, md, sm, xs });
          return;
        }
      } catch {}
    }

    const fallbackWidgets = DEFAULT_WIDGETS;
    setWidgets(fallbackWidgets);
    setLayouts(makeLayoutsFromWidgets(fallbackWidgets));
  }, []);

  // ✅ sync layouts เมื่อ add/remove widget
  useEffect(() => {
    if (widgets.length === 0) return;

    setLayouts((prev: ResponsiveLayouts) => {
      const ids = new Set(widgets.map((w) => w.id));

      const clean = (arr: LayoutItem[] = []) => arr.filter((l) => ids.has(l.i));
      const next: ResponsiveLayouts = {
        lg: clean(prev.lg as LayoutItem[]),
        md: clean(prev.md as LayoutItem[]),
        sm: clean(prev.sm as LayoutItem[]),
        xs: clean(prev.xs as LayoutItem[]),
      };

      const ensure = (bp: keyof ResponsiveLayouts, cols: number) => {
        const existing = new Set((next[bp] as LayoutItem[] ?? []).map((l: LayoutItem) => l.i));
        widgets.forEach((w, idx) => {
          if (existing.has(w.id)) return;
          const x = cols === 12 ? (idx % 2 === 0 ? 0 : 6) : 0;
          const item: LayoutItem =
            cols === 12
              ? defaultLayoutFor(w.id, w.type, x)
              : {
                  i: w.id,
                  x: 0,
                  y: Infinity,
                  w: cols,
                  h: w.type === "kpi" ? 6 : 9,
                };
          next[bp] = [...(next[bp] as LayoutItem[] ?? []), item];
        });
      };

      ensure("lg", 12);
      ensure("md", 12);
      ensure("sm", 12);
      ensure("xs", 12);

      return next;
    });
  }, [widgets]);

  // ✅ save v4
  useEffect(() => {
    if (widgets.length === 0) return;
    localStorage.setItem(STORAGE_KEY_V4, JSON.stringify({ widgets, layouts }));
  }, [widgets, layouts]);

  function addWidget(type: WidgetType) {
    const id = makeId(type);
    const config: WidgetConfig = type === "kpi" ? ({ mode: "all" } as KPIWidgetConfig) : ({ range: "7d" } as ChartWidgetConfig);
    setWidgets((prev) => [...prev, { id, type, config }]);
  }

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    if (settingsId === id) setSettingsId(null);
  }

  function updateWidgetConfig(id: string, patch: Partial<WidgetConfig>) {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const baseConfig: WidgetConfig =
          w.config ?? (w.type === "kpi" ? { mode: "all" } : { range: "7d" });
        return { ...w, config: { ...baseConfig, ...patch } as WidgetConfig };
      })
    );
  }

  const hasWidgets = widgets.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard Builder</h2>
          <p className="text-sm text-gray-500">Drag & drop widgets anywhere on the canvas.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => addWidget("kpi")}
            type="button"
          >
            + Add KPI
          </button>
          <button
            className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => addWidget("chart")}
            type="button"
          >
            + Add Chart
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-[75vh] w-full rounded-2xl border bg-white p-4 shadow-sm">
        {!hasWidgets ? (
          <div className="flex h-[60vh] items-center justify-center text-sm text-gray-500">
            No widgets. Click “Add KPI/Chart” to start.
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
            rowHeight={30}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            compactType={null}
            preventCollision={false}
            draggableHandle=".widget-drag-handle"
            onLayoutChange={(_currentLayout: Layout, allLayouts: ResponsiveLayouts) =>
              setLayouts(allLayouts)
            }
          >
            {widgets.map((w) => (
              <div key={w.id} className="h-full">
                <WidgetCard
                  title={w.type === "kpi" ? "KPI Widget" : "Chart Widget"}
                  onRemove={() => removeWidget(w.id)}
                  onSettings={() => setSettingsId(w.id)}
                >
                  {w.type === "kpi" && <KPIWidget config={w.config as KPIWidgetConfig} />}
                  {w.type === "chart" && <ChartWidget config={w.config as ChartWidgetConfig} />}
                </WidgetCard>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Settings Modal */}
      <WidgetSettingsModal
        open={!!current}
        title={current ? `Settings: ${current.type.toUpperCase()}` : "Settings"}
        onClose={() => setSettingsId(null)}
      >
        {!current ? null : current.type === "kpi" ? (
          <div className="space-y-4">
            <Select
              label="Display mode"
              value={(current.config as KPIWidgetConfig | undefined)?.mode ?? "all"}
              options={[
                { label: "Show all metrics", value: "all" },
                { label: "Show single metric", value: "single" },
              ]}
              onChange={(v) => updateWidgetConfig(current.id, { mode: v as "all" | "single" })}
            />

            <Select
              label="Metric (when single)"
              value={(current.config as KPIWidgetConfig | undefined)?.metric ?? "total_users"}
              options={[
                { label: "Total Users", value: "total_users" },
                { label: "Active Sessions", value: "active_sessions" },
                { label: "Prediction Accuracy", value: "accuracy" },
                { label: "Latency", value: "latency_ms" },
              ]}
              onChange={(v) => updateWidgetConfig(current.id, { metric: v as "total_users" | "active_sessions" | "accuracy" | "latency_ms" })}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Select
              label="Time range"
              value={(current.config as ChartWidgetConfig | undefined)?.range ?? "7d"}
              options={[
                { label: "Last 7 days", value: "7d" },
                { label: "Last 30 days", value: "30d" },
                { label: "Last 90 days", value: "90d" },
              ]}
              onChange={(v) => updateWidgetConfig(current.id, { range: v as "7d" | "30d" | "90d" })}
            />
            <div className="text-xs text-gray-500">
              ถ้า backend ยังไม่รองรับ range ก็ยังจะได้ข้อมูลเหมือนเดิม แต่ front พร้อมแล้ว
            </div>
          </div>
        )}
      </WidgetSettingsModal>
    </div>
  );
}
