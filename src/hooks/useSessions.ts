import { useCallback, useEffect, useState } from "react";
import { listSessionsSince } from "@/db/client";
import type { SessionRecord } from "@/lib/types";
import { useDataStore } from "@/stores/dataStore";

/** 拉取最近若干天的计时记录，统计页与今日概览共用 */
export function useSessions(days = 30) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataVersion = useDataStore((state) => state.version);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
      setSessions(await listSessionsSince(since.toISOString()));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void reload();
  }, [reload, dataVersion]);

  return { sessions, loading, error, reload };
}
