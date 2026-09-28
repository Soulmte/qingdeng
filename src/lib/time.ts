const pad = (value: number) => String(value).padStart(2, "0");

/** 毫秒转 mm:ss，超过一小时自动补上小时段 */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** 毫秒拆成时分秒，供翻页钟按位渲染 */
export function splitClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const text = hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  return { hours, minutes, seconds, text };
}

export function formatTimeOfDay(date: Date, withSeconds = false) {
  const text = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${text}:${pad(date.getSeconds())}` : text;
}

export function formatDateLabel(date: Date) {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

/** 记录列表里的时间列：9/27 14:32 */
export function formatRecordTime(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTimeOfDay(date)}`;
}

/** "25 分钟" / "1 小时 30 分钟" / "2 分 30 秒"，用于模式卡片与模板摘要 */
export function formatDurationLabel(seconds: number) {
  if (seconds <= 0) return "不计时";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  if (rest > 0) parts.push(`${rest} 秒`);

  return parts.length > 0 ? parts.join(" ") : "0 分钟";
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
