import { toDateKey } from "./time";

const MINUTE = 60_000;
const HOUR = 60;
const DAY = 24 * HOUR;

/** 剩余时间拆成天 / 小时 / 分钟 */
export interface CountdownParts {
  /** 目标时刻已经过去了 */
  past: boolean;
  /** 日历天：今天到目标日期中间隔几个零点，每天零点减一 */
  days: number;
  /** 小时与分钟：到了目标这一天才会用到，精确到这一天的时刻 */
  hours: number;
  minutes: number;
}

const pad = (value: number) => String(value).padStart(2, "0");

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * 距离某个日子还有多久。
 *
 * 天用**日历天**：中间隔几个零点就是几天。这样「还有 128 天」一整天都是 128，
 * 到零点才减一；如果按两个时刻的差值去算，目标设成 08:30 的话，
 * 每天的 08:30 数字就跳一次，同一个日子里下午和晚上会显示不同的天数。
 *
 * 小时与分钟只在目标这一天用：到了那一天，改成报还剩几小时几分。
 * 目标时刻本身仍然精确到分钟，决定的是这一天里从什么时候算「到了」。
 */
export function countdownParts(targetAt: string | Date, now: Date): CountdownParts {
  const target = targetAt instanceof Date ? targetAt : new Date(targetAt);
  const targetMs = target.getTime();
  if (Number.isNaN(targetMs)) {
    return { past: false, days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
  const diff = targetMs - now.getTime();
  const total = Math.floor(Math.abs(diff) / MINUTE);

  return {
    past: diff < 0,
    days: Math.abs(days),
    hours: Math.floor((total % DAY) / HOUR),
    minutes: total % 60,
  };
}

/**
 * 一句话说清剩余时间，用在放不下大数字的地方（沉浸模式、提醒文字）。
 * 一天以上只报到天，到了那一天报到分钟，与卡片上那个大数字同一套口径。
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

/** 新建时默认停在下一天的 23:59，也就是「整天都算还没到」 */
export function defaultTargetDate(now: Date) {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return toDateKey(next);
}

/** 与默认日期配套的默认时刻 */
export const DEFAULT_TARGET_TIME = "23:59";
