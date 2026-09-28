import type { ClockFace } from "@/lib/types";
import { FlipClock } from "./FlipClock";
import { PlainClock } from "./PlainClock";
import { RingClock } from "./RingClock";
import type { ClockViewProps } from "./types";

/** 按用户选择的时钟形态分发，三种形态共用同一套数据 */
export function ClockFaceView({ face, ...props }: ClockViewProps & { face: ClockFace }) {
  if (face === "flip") return <FlipClock {...props} />;
  if (face === "plain") return <PlainClock {...props} />;
  return <RingClock {...props} />;
}
