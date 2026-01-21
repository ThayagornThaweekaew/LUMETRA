import { useEffect, useMemo, useState } from "react";
import GridLayout, { type LayoutItem, noCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import WidgetCard from "../../components/dashboard/widgets/WidgetCard";
import WidgetFrame from "../../components/dashboard/widgets/WidgetFrame";
import KPIWidget from "../../components/dashboard/widgets/KPIWidget";
import ChartWidget from "../../components/dashboard/widgets/ChartWidget";

type WidgetType = "kpi" | "chart";
type WidgetDef = { id: string; type: WidgetType; config: any };

const DASHBOARD_ID = "default";

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

function makeLayoutFromWidgets(widgets: WidgetDef[]): LayoutItem[] {
  // 12 cols
  return widgets.map((w, idx) => ({
    i: w.id,
    x: (idx % 2) * 6,
    y: Math.floor(idx / 2) * 10,
    w: 6,
    h: w.type === "chart" ? 10 : 6,
    minW: 4,
    minH: 4,
  }));
}

function getColsByWidth(width: number) {
  // ปรับ breakpoint เองแบบง่าย ๆ
  if (width >= 1200) return 12;
  if (width >= 996) return 10;
  if (width >= 768) return 6;
  return 4;
}

export default function DashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
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

  // resize listener
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

        // รองรับ data.layouts.lg/md/... ของเก่า
        const loadedAnyLayout =
          (data.layouts?.lg && Array.isArray(data.layouts.lg) && data.layouts.lg.length) ||
          (data.layouts?.md && Array.isArray(data.layouts.md) && data.layouts.md.length) ||
          (data.layouts?.sm && Array.isArray(data.layouts.sm) && data.layouts.sm.length) ||
          (data.layouts?.xs && Array.isArray(data.layouts.xs) && data.layouts.xs.length);

        const loadedLayout: LayoutItem[] = loadedAnyLayout
          ? // เอา lg เป็นหลัก ถ้าไม่มีค่อย fallback
            (data.layouts?.lg ?? data.layouts?.md ?? data.layouts?.sm ?? data.layouts?.xs ?? [])
          : Array.isArray(data.layout)
          ? data.layout
          : makeLayoutFromWidgets(normalizedWidgets);

        setWidgets(normalizedWidgets);
        setLayout(loadedLayout);
      } catch {
        const saved = localStorage.getItem("dashboard-layout-v2");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const normalizedWidgets = normalizeWidgets(parsed.widgets);

            const loadedLayout: LayoutItem[] = Array.isArray(parsed.layout)
              ? parsed.layout
              : Array.isArray(parsed.layouts?.lg)
              ? parsed.layouts.lg
              : makeLayoutFromWidgets(normalizedWidgets);

            setWidgets(normalizedWidgets);
            setLayout(loadedLayout);
          } catch {
            setWidgets(DEFAULT_WIDGETS);
            setLayout(makeLayoutFromWidgets(DEFAULT_WIDGETS));
          }
        } else {
          setWidgets(DEFAULT_WIDGETS);
          setLayout(makeLayoutFromWidgets(DEFAULT_WIDGETS));
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
        // ส่งแบบที่ backend คุณรับได้ (widgets + layouts) และกันด้วย layout เดี่ยว
        const payload = {
          widgets,
          layout,
          layouts: { lg: layout, md: layout, sm: layout, xs: layout },
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
      type === "chart"
        ? { id, type, config: { range: "7d" } }
        : { id, type, config: { mode: "all" } };

    setWidgets((prev) => [...prev, newWidget]);

    setLayout((prev) => [
      ...prev,
      {
        i: id,
        x: 0,
        y: Infinity,
        w: Math.min(6, cols),
        h: type === "chart" ? 10 : 6,
        minW: 4,
        minH: 4,
      },
    ]);
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayout((prev) => prev.filter((l) => l.i !== id));
  };

  const openSettings = (id: string) => {
    setActiveSettingsId(id);
    console.log("⚙ open settings for", id);
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  return (
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
      <GridLayout
        className="layout"
        layout={layout}
        width={width - 48} // padding ซ้ายขวา (px-6) = 24*2 = 48
        gridConfig={{
          cols,
          rowHeight: 30,
          margin: [16, 16] as const,
          containerPadding: [0, 0] as const,
          maxRows: Infinity,
        }}
        dragConfig={{
          enabled: true,
          bounded: false,
          handle: ".widget-drag-handle",
          threshold: 3,
        }}
        resizeConfig={{
          enabled: true,
          handles: ["se"],
        }}
        compactor={noCompactor}
        onLayoutChange={(next) => setLayout([...next])}
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
      </GridLayout>

      {/* ยังไม่ทำ modal จริง */}
      {activeSettingsId ? null : null}
    </div>
  );
}
