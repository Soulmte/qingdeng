import type { PieData } from "@/components/charts";
import { fromDateKey, shiftDays, toDateKey } from "./time";
import type { SessionRecord } from "./types";

export interface DailyFocusPoint {
  [key: string]: unknown;
  key: string;
  date: Date;
  label: string;
  minutes: number;
  rounds: number;
}

export interface SessionSummary {
  todayMinutes: number;
  rangeMinutes: number;
  completedRounds: number;
  averageMinutes: number;
}

/**
 * 按天整理专注数据。
 * 区间最多回溯 days 天，但会从「第一条记录那天」开始截断，
 * 否则刚开始用的人会在图上看到一长串空白天。
 */
export function buildDailySeries(sessions: SessionRecord[], days: number): DailyFocusPoint[] {
  const points: DailyFocusPoint[] = [];
  const positions = new Map<string, number>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeStart = shiftDays(today, -(days - 1));

  const focusKeys = sessions
    .filter((session) => session.phase === "focus")
    .map((session) => toDateKey(new Date(session.endedAt)));
  const earliestKey = focusKeys.length > 0 ? focusKeys.reduce((min, key) => (key < min ? key : min)) : null;
  const earliest = earliestKey ? fromDateKey(earliestKey) : null;
  const start = earliest && earliest > rangeStart ? earliest : rangeStart;

  for (let day = new Date(start); day <= today; day = shiftDays(day, 1)) {
    positions.set(toDateKey(day), points.length);
    points.push({
      key: toDateKey(day),
      date: new Date(day),
      label: `${day.getMonth() + 1}/${day.getDate()}`,
      minutes: 0,
      rounds: 0,
    });
  }

  for (const session of sessions) {
    if (session.phase !== "focus") continue;
    const position = positions.get(toDateKey(new Date(session.endedAt)));
    if (position === undefined) continue;
    points[position].minutes += session.actualSeconds / 60;
    if (session.completed === 1) points[position].rounds += 1;
  }

  return points.map((point) => ({ ...point, minutes: Math.round(point.minutes) }));
}

/** 各模板的专注时长占比，最多取前五名 */
export function buildTemplateBreakdown(sessions: SessionRecord[]): PieData[] {
  const totals = new Map<string, number>();

  for (const session of sessions) {
    if (session.phase !== "focus" || session.actualSeconds <= 0) continue;
    totals.set(session.presetName, (totals.get(session.presetName) ?? 0) + session.actualSeconds);
  }

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, seconds], index) => ({
      label,
      value: Math.round(seconds / 60),
      color: `var(--chart-${index + 1})`,
    }));
}

export function summarizeSessions(sessions: SessionRecord[]): SessionSummary {
  const focus = sessions.filter((session) => session.phase === "focus");
  const todayKey = toDateKey(new Date());
  let todaySeconds = 0;
  let rangeSeconds = 0;
  let completedRounds = 0;

  for (const session of focus) {
    rangeSeconds += session.actualSeconds;
    if (session.completed === 1) completedRounds += 1;
    if (toDateKey(new Date(session.endedAt)) === todayKey) todaySeconds += session.actualSeconds;
  }

  return {
    todayMinutes: Math.round(todaySeconds / 60),
    rangeMinutes: Math.round(rangeSeconds / 60),
    completedRounds,
    averageMinutes: focus.length > 0 ? Math.round(rangeSeconds / focus.length / 60) : 0,
  };
}
