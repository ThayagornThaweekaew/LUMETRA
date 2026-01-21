import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";

import WidgetCard from "../../components/dashboard/widgets/WidgetCard";
import KPIWidget from "../../components/dashboard/widgets/KPIWidget";
import ChartWidget from "../../components/dashboard/widgets/ChartWidget";

const DEFAULT_WIDGETS = ["kpi", "chart"];

export default function DashboardLayout() {
  const [widgets, setWidgets] = useState<string[]>([]);

  console.log("✅ DashboardLayout rendered");

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-layout");
    console.log("📦 saved layout =", saved);

    if (!saved) {
      setWidgets(DEFAULT_WIDGETS);
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      // ✅ ต้องเป็น string[] และต้องไม่ว่าง
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((x) => typeof x === "string")
      ) {
        setWidgets(parsed);
      } else {
        setWidgets(DEFAULT_WIDGETS);
      }
    } catch {
      setWidgets(DEFAULT_WIDGETS);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-layout", JSON.stringify(widgets));
  }, [widgets]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        setWidgets((items) => {
          const oldIndex = items.indexOf(String(active.id));
          const newIndex = items.indexOf(String(over.id));

          // ✅ กันกรณี id ไม่อยู่ใน list (จะไม่ crash / ไม่ reorder แปลก ๆ)
          if (oldIndex === -1 || newIndex === -1) return items;

          return arrayMove(items, oldIndex, newIndex);
        });
      }}
    >
      <SortableContext items={widgets} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {widgets.map((id) => {
            console.log("🧩 render widget:", id);

            return (
              <WidgetCard key={id} id={id}>
                {id === "kpi" && <KPIWidget />}
                {id === "chart" && <ChartWidget />}
              </WidgetCard>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
