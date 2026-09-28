/**
 * 时钟文字相对容器宽度的比例。
 *
 * 以前是按窗口宽度挑 text-5xl / text-7xl 这类固定字号，每个档位都是人肉试出来的，
 * 容器一变窄（手机竖屏、横屏）就会出现「字顶出圆环」。改用 cqw 之后字号只跟容器走，
 * 320px 的手机和 4K 显示器共用同一套比例，不必再为每种屏幕补一个档位。
 *
 * 三档按字符数分：5 位以内（25:00）、6 到 7 位（1:30:00）、8 位及以上（10:00:00）。
 * 容器元素需要挂 .clock-box，它声明了 container-type: inline-size。
 */
const TEXT_SCALE: Record<"ring" | "plain", [string, string, string]> = {
  ring: ["text-[14cqw]", "text-[11.5cqw]", "text-[9.2cqw]"],
  plain: ["text-[20cqw]", "text-[15cqw]", "text-[11.25cqw]"],
};

export function clockTextClass(flavour: "ring" | "plain", text: string) {
  const bucket = text.length <= 5 ? 0 : text.length <= 7 ? 1 : 2;
  return TEXT_SCALE[flavour][bucket];
}
