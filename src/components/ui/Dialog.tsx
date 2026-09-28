import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 弹层嵌套层级：1 为普通弹层，2 为在弹层之上再开的编辑器 */
  layer?: 1 | 2;
  className?: string;
}

/**
 * 轻量弹层：只做「遮罩 + 居中面板 + Esc 关闭」，
 * 不用 HeroUI 的 Modal，避免受控 DialogTrigger 在没有触发元素时不渲染。
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  layer = 1,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const overlay = (
    <div
      className={cn(
        // 手机上贴底展开，像系统里的面板；宽屏回到居中卡片
        "fixed inset-0 flex items-end justify-center sm:items-center sm:p-6",
        layer === 2 ? "z-60" : "z-50",
      )}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          // 默认 max-w-md 会被调用方传的 max-w-* 覆盖（cn 走 twMerge）；
          // 手机竖屏再铺满，那一条放在 index.css 的 .dialog-sheet 里，
          // 因为要用未分层规则才能稳定盖住同层的 max-w 工具类。
          "dialog-sheet relative flex max-h-[92dvh] w-full max-w-md animate-[immersive-enter_160ms_ease-out] flex-col gap-4 overflow-y-auto rounded-t-2xl border border-foreground/5 bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-full sm:rounded-2xl sm:p-6 sm:pb-6",
          className,
        )}
      >
        {/* 手机上贴底时给一条提起的提示，让人知道可以往下拖回去 */}
        <span
          aria-hidden
          className="mx-auto h-1 w-10 shrink-0 rounded-full bg-foreground/15 sm:hidden"
        />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description ? <p className="text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="cursor-[var(--cursor-interactive)] rounded-lg p-1.5 text-muted transition-colors hover:bg-default hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">{children}</div>

        {footer ? <div className="flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );

  // 挂到 body 上，避免被外层弹层的滚动容器裁掉；SSR 环境没有 document 时直接渲染
  return typeof document === "undefined" ? overlay : createPortal(overlay, document.body);
}
