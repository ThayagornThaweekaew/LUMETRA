import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";

import WidgetCard from "./widgets/WidgetCard";
import KPIWidget from "./widgets/KPIWidget";
import ChartWidget from "./widgets/ChartWidget";

const DEFAULT_WIDGETS = ["kpi", "chart"];

export default function AdvancedDashboard() {
  const [widgets, setWidgets] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("advanced-dashboard-layout");
    setWidgets(saved ? JSON.parse(saved) : DEFAULT_WIDGETS);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "advanced-dashboard-layout",
      JSON.stringify(widgets)
    );
  }, [widgets]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
          setWidgets((items) => {
            const oldIndex = items.indexOf(active.id as string);
            const newIndex = items.indexOf(over.id as string);
            return arrayMove(items, oldIndex, newIndex);
          });
        }
      }}
    >
      <SortableContext items={widgets} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {widgets.map((id) => (
            <WidgetCard key={id} id={id}>
              {id === "kpi" && <KPIWidget />}
              {id === "chart" && <ChartWidget />}
            </WidgetCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
