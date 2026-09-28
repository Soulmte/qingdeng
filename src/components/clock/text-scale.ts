import type { ClockSize } from "./types";

/**
 * 时间文本的字号表：位数越多字号越小，避免 "10:00:00" 顶到圆环外面。
 * 三个档位分别是 5 位以内（25:00）、6 到 7 位（1:30:00）、8 位及以上（10:00:00）。
 */
const SCALE_TABLE: Record<"ring" | "plain", Record<ClockSize, [string, string, string]>> = {
  ring: {
    md: ["text-7xl", "text-6xl", "text-5xl"],
    lg: ["text-8xl", "text-7xl", "text-6xl"],
  },
  plain: {
    md: ["text-9xl", "text-8xl", "text-7xl"],
    lg: ["text-[10rem]", "text-[8.5rem]", "text-[7rem]"],
  },
};

export function clockTextClass(flavour: "ring" | "plain", size: ClockSize, text: string) {
  const bucket = text.length <= 5 ? 0 : text.length <= 7 ? 1 : 2;
  return SCALE_TABLE[flavour][size][bucket];
}
