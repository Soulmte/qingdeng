import { useId } from "react";

interface BrandMarkProps {
  className?: string;
  /** 轻微摇曳的灯火动效，用在侧边栏的品牌位上 */
  pulse?: boolean;
}

/**
 * 青灯标识：一碟油灯配一簇灯火。
 * 结构分四层——光晕、灯焰（外焰 + 内焰）、灯芯、灯身（碟口 + 碟身 + 圈足），
 * 颜色全部取自主题变量，暗色场景会自动换成更亮的青与暖橙。
 */
export function BrandMark({ className, pulse }: BrandMarkProps) {
  const uid = useId();
  const glowId = `${uid}-glow`;
  const flameId = `${uid}-flame`;
  const bodyId = `${uid}-body`;

  return (
    <svg viewBox="0 0 128 128" className={className} role="img" aria-label="青灯">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="34%" r="50%">
          <stop offset="0%" stopColor="var(--flame)" stopOpacity="0.4" />
          <stop offset="60%" stopColor="var(--flame)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--flame)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={flameId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--flame)" />
          <stop offset="100%" stopColor="var(--flame-core)" />
        </linearGradient>
        <linearGradient id={bodyId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--lamp)" />
          <stop offset="100%" stopColor="var(--lamp-strong)" />
        </linearGradient>
      </defs>

      {/* 光晕与光环，以及会轻微摇曳的灯焰 */}
      <g
        className={pulse ? "animate-[lamp-flicker_3.6s_ease-in-out_infinite]" : undefined}
        style={{ transformBox: "view-box", transformOrigin: "64px 46px" }}
      >
        <circle cx="64" cy="44" r="42" fill={`url(#${glowId})`} />
        <circle
          cx="64"
          cy="46"
          r="33"
          fill="none"
          stroke="var(--flame)"
          strokeWidth="1.4"
          opacity="0.18"
        />

        {/* 外焰 */}
        <path
          d="M64 20c7.2 11.6 11.8 20 11.8 27.2 0 7-5.3 12.2-11.8 12.2s-11.8-5.2-11.8-12.2C52.2 40 56.8 31.6 64 20Z"
          fill={`url(#${flameId})`}
        />
        {/* 内焰 */}
        <path
          d="M64 32.5c3.5 5.7 5.7 9.8 5.7 13.3 0 3.4-2.5 6-5.7 6s-5.7-2.6-5.7-6c0-3.5 2.2-7.6 5.7-13.3Z"
          fill="var(--flame-core)"
        />
        {/* 灯芯 */}
        <path d="M64 56.5v8" stroke="var(--flame)" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* 灯身 */}
      <path d="M30 70c0 10.6 15.2 19 34 19s34-8.4 34-19Z" fill={`url(#${bodyId})`} />
      <ellipse cx="64" cy="70" rx="34" ry="6.4" fill="var(--lamp-strong)" opacity="0.92" />
      <path
        d="M30 70c0 3.6 15.2 6.6 34 6.6s34-3 34-6.6"
        fill="none"
        stroke="var(--lamp)"
        strokeWidth="1.6"
        opacity="0.55"
      />

      {/* 颈与圈足 */}
      <path d="M59.5 88.5h9v5.5h-9z" fill="var(--lamp-strong)" />
      <path d="M53 94h22l4.5 7.5h-31z" fill={`url(#${bodyId})`} />
      <rect x="43" y="101.5" width="42" height="5.5" rx="2.75" fill="var(--lamp-strong)" />
    </svg>
  );
}

/**
 * 单盏灯的小图形，用来表示「今天点亮了几盏」。
 * lit 为 true 时是点亮的青灯，否则是未点亮的灯架轮廓。
 */
export function LampUnit({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 4c2.2 3.4 3.6 5.9 3.6 8a3.6 3.6 0 0 1-7.2 0c0-2.1 1.4-4.6 3.6-8Z"
        fill={lit ? "var(--flame)" : "var(--ring-track)"}
      />
      <path d="M12 14.6v1.6" stroke={lit ? "var(--flame)" : "var(--ring-track)"} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M4.4 16.2h15.2c0 2.6-3.4 4.6-7.6 4.6s-7.6-2-7.6-4.6Z"
        fill={lit ? "var(--accent)" : "var(--ring-track)"}
      />
      <path d="M9 21.4h6" stroke={lit ? "var(--lamp)" : "var(--ring-track)"} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
