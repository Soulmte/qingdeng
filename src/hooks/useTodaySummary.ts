import { useCallback, useEffect, useState } from "react";
import { listSessionsSince } from "@/db/client";
import { useDataStore } from "@/stores/dataStore";

/** 侧边栏用的今日概览：专注分钟数与完成的番茄个数 */
export function useTodaySummary() {
  const dataVersion = useDataStore((state) => state.version);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);

  const reload = useCallback(async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const rows = await listSessionsSince(startOfDay.toISOString());
      const focus = rows.filter((row) => row.phase === "focus");
      setFocusMinutes(Math.round(focus.reduce((sum, row) => sum + row.actualSeconds, 0) / 60));
      setCompletedRounds(focus.filter((row) => row.completed === 1).length);
    } catch {
      setFocusMinutes(0);
      setCompletedRounds(0);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, dataVersion]);

  return { focusMinutes, completedRounds, reload };
}
