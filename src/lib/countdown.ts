import { toDateKey } from "./time";

const MINUTE = 60_000;
const HOUR = 60;
const DAY = 24 * HOUR;

/** 剩余时间拆成天 / 小时 / 分钟，全部向下取整 */
export interface CountdownParts {
  /** 目标时刻已经过去了 */
  past: boolean;
  days: number;
  hours: number;
  minutes: number;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * 距离某个时刻还有多久。
 *
 * 向下取整：写「还有 128 天」时那 128 天是完整的，剩多少小时另说。
 * 目标时刻是「到达那一刻」，所以给考试日设成当天 00:00 的话，
 * 前一天晚上就会显示「还有 1 小时」，而不是「还有 1 天」。
 */
export function countdownParts(targetAt: string | Date, now: Date): CountdownParts {
  const target = targetAt instanceof Date ? targetAt : new Date(targetAt);
  const targetMs = target.getTime();
  if (Number.isNaN(targetMs)) {
    return { past: false, days: 0, hours: 0, minutes: 0 };
  }

  const diff = targetMs - now.getTime();
  const total = Math.floor(Math.abs(diff) / MINUTE);
  return {
    past: diff < 0,
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / HOUR),
    minutes: total % 60,
  };
}

/**
 * 一句话说清剩余时间，用在放不下大数字的地方（沉浸模式、提醒文字）。
 * 一天以上只报到天，一天以内报到分钟，与卡片上那个大数字保持一致。
 */
export function formatRemaining(parts: CountdownParts) {
  const head = parts.past ? "已过去" : "还有";

  if (parts.days > 0) return `${head} ${parts.days} 天`;
  if (parts.hours > 0) {
    return parts.minutes > 0
      ? `${head} ${parts.hours} 小时 ${parts.minutes} 分`
      : `${head} ${parts.hours} 小时`;
  }
  if (parts.minutes > 0) return `${head} ${parts.minutes} 分钟`;
  return parts.past ? "刚刚过去" : "就是现在";
}

/** 卡片上那个大数字：不足一天时换成小时或分钟，避免一直显示 0 天 */
export function primaryUnit(parts: CountdownParts) {
  if (parts.days > 0) return { value: parts.days, unit: "天" };
  if (parts.hours > 0) return { value: parts.hours, unit: "小时" };
  return { value: parts.minutes, unit: "分钟" };
}

/** 目标时刻写成「2026年12月26日 08:30」，时刻精确到分钟 */
export function formatTargetAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${formatTimeInput(date)}`;
}

/** <input type="time"> 的值：HH:mm */
export function formatTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 日期 + 时间两个输入拼回时间戳。
 *
 * 刻意不用 `new Date("2026-12-26")`：那个写法按 UTC 解析，
 * 在东八区会变成前一天早上 8 点，倒计时整整差一天。
 * 这里按本地时间逐段构造，并校验日期没有溢出（比如 2 月 30 日）。
 */
export function fromDateTimeInput(dateValue: string, timeValue: string): string | null {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = (timeValue || "00:00").split(":").map(Number);

  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const value = new Date(year, month - 1, day, hours, minutes, 0, 0);
  // 2 月 30 日这种会被 Date 顺延到下个月，这里挡掉
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  ) {
    return null;
  }
  return value.toISOString();
}

/** 新建时默认停在下一天的 00:00 */
export function defaultTargetDate(now: Date) {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return toDateKey(next);
}
