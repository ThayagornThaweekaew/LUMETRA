import { useEffect, useMemo, useState } from "react";
import GridLayout, { type Layout, type Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import WidgetCard from "../../components/dashboard/widgets/WidgetCard";
import KPIWidget from "../../components/dashboard/widgets/KPIWidget";
import ChartWidget from "../../components/dashboard/widgets/ChartWidget";
import WidgetSettingsModal, { Select } from "../../components/dashboard/widgets/WidgetSettingsModal";

type WidgetType = "kpi" | "chart";
type WidgetDef = { id: string; type: WidgetType; config: any };

// ✅ เปลี่ยน id เพื่อ “ไม่ติด layout เก่า”
const DASHBOARD_ID = "default_small_v1";

const DEFAULT_WIDGETS: WidgetDef[] = [
  { id: "kpi-1", type: "kpi", config: { mode: "all" } },
  { id: "chart-1", type: "chart", config: { range: "7d" } },
];

function getColsByWidth(width: number) {
  if (width >= 1200) return 24;
  if (width >= 996) return 20;
  if (width >= 768) return 12;
  return 6;
}

function makeId(type: WidgetType) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${type}-${crypto.randomUUID()}`;
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeWidgets(raw: any): WidgetDef[] {
  const arr = Array.isArray(raw) ? raw : [];
  const normalized: WidgetDef[] = arr.map((w: any, idx: number) => {
    if (typeof w === "string") return { id: `${w}-${idx}`, type: w as WidgetType, config: {} };
    return {
      id: String(w.id ?? `${w.type ?? "widget"}-${idx}`),
      type: (w.type ?? "kpi") as WidgetType,
      config: w.config ?? {},
    };
  });
  return normalized.length ? normalized : DEFAULT_WIDGETS;
}

/** ✅ ย่อได้เล็กลง: ลด minW/minH */
const MIN_W = 3; // <- ย่อได้เล็กมาก (ถ้าแคบเกินไปค่อยปรับเป็น 4)
const MIN_H = 3;

function clampLayoutMin(layout: Layout): Layout {
  return layout.map((l) => ({
    ...l,
    minW: Math.min(l.minW ?? MIN_W, MIN_W) || MIN_W,
    minH: Math.min(l.minH ?? MIN_H, MIN_H) || MIN_H,
    w: Math.max(l.w, MIN_W),
    h: Math.max(l.h, MIN_H),
  }));
}

function makeLayoutFromWidgets(widgets: WidgetDef[], cols: number): Layout {
  const w = Math.max(6, Math.floor(cols / 2)); // 2 คอลัมน์แบบเดิม
  return widgets.map((wd, idx) => ({
    i: wd.id,
    x: (idx % 2) * w,
    y: Math.floor(idx / 2) * 10,
    w,
    h: wd.type === "chart" ? 10 : 6,
    minW: MIN_W,
    minH: MIN_H,
  }));
}

export default function DashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [layout, setLayout] = useState<Layout>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);

  const [width, setWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);
  const cols = useMemo(() => getColsByWidth(width), [width]);

  const widgetMap = useMemo(() => {
    const m = new Map<string, WidgetDef>();
    widgets.forEach((w) => m.set(w.id, w));
    return m;
  }, [widgets]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ Load: MongoDB -> fallback localStorage -> default
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/layout/${DASHBOARD_ID}`);
        if (!res.ok) throw new Error("load failed");
        const data: any = await res.json();

        const normalizedWidgets = normalizeWidgets(data.widgets);

        const loadedAnyLayout =
          (data.layouts?.lg && Array.isArray(data.layouts.lg) && data.layouts.lg.length) ||
          (data.layouts?.md && Array.isArray(data.layouts.md) && data.layouts.md.length) ||
          (data.layouts?.sm && Array.isArray(data.layouts.sm) && data.layouts.sm.length) ||
          (data.layouts?.xs && Array.isArray(data.layouts.xs) && data.layouts.xs.length);

        const rawLayout: Layout = loadedAnyLayout
          ? (data.layouts?.lg ?? data.layouts?.md ?? data.layouts?.sm ?? data.layouts?.xs ?? [])
          : Array.isArray(data.layout)
          ? data.layout
          : makeLayoutFromWidgets(normalizedWidgets, cols);

        setWidgets(normalizedWidgets);
        setLayout(clampLayoutMin(rawLayout)); // ✅ บังคับ minW/minH ใหม่
      } catch {
        const saved = localStorage.getItem("dashboard-layout-v2");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const normalizedWidgets = normalizeWidgets(parsed.widgets);

            const rawLayout: Layout = Array.isArray(parsed.layout)
              ? parsed.layout
              : Array.isArray(parsed.layouts?.lg)
              ? parsed.layouts.lg
              : makeLayoutFromWidgets(normalizedWidgets, cols);

            setWidgets(normalizedWidgets);
            setLayout(clampLayoutMin(rawLayout)); // ✅ บังคับ minW/minH ใหม่
          } catch {
            setWidgets(DEFAULT_WIDGETS);
            setLayout(makeLayoutFromWidgets(DEFAULT_WIDGETS, cols));
          }
        } else {
          setWidgets(DEFAULT_WIDGETS);
          setLayout(makeLayoutFromWidgets(DEFAULT_WIDGETS, cols));
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Autosave (debounce): MongoDB + localStorage
  useEffect(() => {
    if (loading) return;

    const t = setTimeout(async () => {
      try {
        setSaving(true);
        const payload = {
          widgets,
          layout,
          layouts: { lg: layout, md: layout, sm: layout, xs: layout } as Layouts,
        };

        await fetch(`http://localhost:8080/api/layout/${DASHBOARD_ID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        localStorage.setItem("dashboard-layout-v2", JSON.stringify(payload));
      } catch {
        localStorage.setItem(
          "dashboard-layout-v2",
          JSON.stringify({ widgets, layout, layouts: { lg: layout, md: layout, sm: layout, xs: layout } })
        );
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [widgets, layout, loading]);

  const addWidget = (type: WidgetType) => {
    const id = makeId(type);
    const newWidget: WidgetDef =
      type === "chart" ? { id, type, config: { range: "7d" } } : { id, type, config: { mode: "all" } };

    setWidgets((prev) => [...prev, newWidget]);

    const w = Math.max(6, Math.floor(cols / 2));

    setLayout((prev) => [
      ...prev,
      {
        i: id,
        x: 0,
        y: Infinity,
        w,
        h: type === "chart" ? 10 : 6,
        minW: MIN_W, // ✅ ย่อได้เล็ก
        minH: MIN_H,
      },
    ]);
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayout((prev) => prev.filter((l) => l.i !== id));
  };

  const openSettings = (id: string) => setActiveSettingsId(id);
  const closeSettings = () => setActiveSettingsId(null);

  const updateWidgetConfig = (id: string, patch: any) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, config: { ...(w.config ?? {}), ...patch } } : w)));
  };

  const activeWidget = activeSettingsId ? widgetMap.get(activeSettingsId) ?? null : null;

  if (loading) return <div className="p-6">Loading dashboard.</div>;

  return (
    <div className="w-full min-h-screen px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Builder</h1>
          <p className="text-sm text-gray-500">ลากวางอิสระ + ย่อ/ขยายได้ • autosave MongoDB</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="mr-3 text-sm text-gray-500">{saving ? "Saving." : "Saved"}</div>

          <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addWidget("kpi")}>
            + Add KPI
          </button>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addWidget("chart")}>
            + Add Chart
          </button>
        </div>
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        cols={cols}
        rowHeight={20}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        width={width - 48}
        isDraggable
        isResizable
        draggableHandle=".widget-drag-handle"
        resizeHandles={["se"]}
        compactType={null}
        preventCollision={false}
        useCSSTransforms
        onLayoutChange={(next) => setLayout(clampLayoutMin(next))} // ✅ กัน minW/minH เด้งกลับจาก layout เก่า
      >
        {widgets.map((w) => {
          const widget = widgetMap.get(w.id);
          if (!widget) return null;

          return (
            <div key={w.id}>
              <WidgetCard className="h-full">
                <div className="mb-2 flex items-center justify-between">
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

                {widget.type === "kpi" && <KPIWidget config={widget.config} />}
                {widget.type === "chart" && <ChartWidget config={widget.config} />}
              </WidgetCard>
            </div>
          );
        })}
      </GridLayout>

      <WidgetSettingsModal open={!!activeWidget} title={`Settings: ${activeWidget?.type ?? ""}`} onClose={closeSettings}>
        {!activeWidget ? null : activeWidget.type === "chart" ? (
          <Select
            label="Range"
            value={activeWidget.config?.range ?? "7d"}
            options={[
              { label: "Last 7 days", value: "7d" },
              { label: "Last 30 days", value: "30d" },
              { label: "Last 90 days", value: "90d" },
            ]}
            onChange={(v) => updateWidgetConfig(activeWidget.id, { range: v })}
          />
        ) : (
          <>
            <Select
              label="Mode"
              value={activeWidget.config?.mode ?? "all"}
              options={[
                { label: "All", value: "all" },
                { label: "Single metric", value: "single" },
              ]}
              onChange={(v) => updateWidgetConfig(activeWidget.id, { mode: v })}
            />

            {(activeWidget.config?.mode ?? "all") === "single" && (
              <div className="mt-4">
                <Select
                  label="Metric"
                  value={activeWidget.config?.metric ?? "total_users"}
                  options={[
                    { label: "Total Users", value: "total_users" },
                    { label: "Active Sessions", value: "active_sessions" },
                    { label: "Prediction Accuracy", value: "accuracy" },
                    { label: "Latency (ms)", value: "latency_ms" },
                  ]}
                  onChange={(v) => updateWidgetConfig(activeWidget.id, { metric: v })}
                />
              </div>
            )}
          </>
        )}
      </WidgetSettingsModal>
    </div>
  );
}
