"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { snapDetent, type Detent } from "@/lib/sheet";

type Props = {
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  /** Visible height (phone) once the sheet settles, so the map can keep results clear of it. */
  onHeightChange?: (px: number) => void;
  /** Header content; receives whether the sheet is collapsed into the search pill. */
  header: ReactNode | ((pill: boolean) => ReactNode);
  children: ReactNode;
  /** Changing this scrolls the content back to the top (e.g. when a camera is picked). */
  scrollKey?: string | number | null;
};

const EDGE = 8; // gap around the floating sheet, px
const HANDLE = 20; // grab handle strip height, px
const DRAG_THRESHOLD = 6; // px before a press on the header becomes a drag

/**
 * Apple Maps–style search sheet: a draggable bottom sheet with three snap heights
 * on phones, and a floating card on the left on larger screens.
 */
export default function Sheet(props: Props) {
  const desktop = useMediaQuery("(min-width: 640px)");
  return desktop ? <DesktopCard {...props} /> : <BottomSheet {...props} />;
}

function DesktopCard({ header, children, scrollKey }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  return (
    <section className="glass absolute left-4 top-4 flex max-h-[calc(100dvh-2rem)] w-96 flex-col overflow-hidden rounded-3xl">
      <div className="p-4 pb-3">{typeof header === "function" ? header(false) : header}</div>
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {children}
      </div>
    </section>
  );
}

function BottomSheet({ detent, onDetentChange, onHeightChange, header, children, scrollKey }: Props) {
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const [viewport, setViewport] = useState(() => window.innerHeight);
  const [dragVisible, setDragVisible] = useState<number | null>(null);
  const press = useRef<{ y: number; visible: number; dragging: boolean; lastY: number; lastT: number; v: number } | null>(
    null,
  );

  // The visible area (iOS shrinks and pans it for the keyboard), so the sheet can sit
  // on top of the keyboard and never grow past the top of what's on screen.
  const [keyboard, setKeyboard] = useState<{ height: number; top: number; bottom: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const height = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboard(height > 0 ? { height, top: vv.offsetTop, bottom: vv.offsetTop + vv.height } : null);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setViewport(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  // Collapsed, the sheet is just the floating search pill (no handle).
  const pill = detent === "peek" && dragVisible === null;
  const heights = {
    peek: headerHeight + (pill ? 0 : HANDLE),
    half: Math.round(viewport * 0.5),
    full: viewport - 56 - EDGE * 2,
  };
  // Full with the keyboard up (searching): pin the top to the top of what's on screen
  // (iOS pans the view for the keyboard) and let the keyboard cover the bottom.
  // Otherwise with the keyboard up the sheet sits on top of it, capped to the space left.
  const underKeyboard = keyboard !== null && detent === "full" && dragVisible === null;
  const visible = Math.min(
    dragVisible ?? heights[detent],
    keyboard ? keyboard.bottom - keyboard.top - EDGE * 2 : Infinity,
  );
  const settled = heights[detent];

  useEffect(() => {
    onHeightChange?.(settled);
  }, [settled, onHeightChange]);

  const onPointerDown = (e: PointerEvent) => {
    press.current = { y: e.clientY, visible, dragging: false, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
    // Keep receiving moves after the pointer leaves the sheet (e.g. dragging up from peek).
    // Not on controls, so taps on inputs and buttons still land on them.
    if (!(e.target as HTMLElement).closest("input, button, a")) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const dy = p.y - e.clientY;
    if (!p.dragging) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      p.dragging = true;
      const el = e.currentTarget as HTMLElement;
      if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      (document.activeElement as HTMLElement | null)?.blur();
    }
    const dt = Math.max(1, e.timeStamp - p.lastT);
    p.v = (p.lastY - e.clientY) / dt;
    p.lastY = e.clientY;
    p.lastT = e.timeStamp;
    setDragVisible(Math.min(heights.full, Math.max(heights.peek * 0.7, p.visible + dy)));
  };
  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (!p?.dragging || dragVisible === null) return;
    const next = snapDetent(dragVisible, p.v, heights);
    setDragVisible(null);
    onDetentChange(next);
  };

  return (
    <section
      // Fixed so it stays above Safari's toolbar; Safari also tints the toolbar from it.
      // The pill doesn't clip, so address suggestions can float above it.
      className={`fixed inset-x-3 flex flex-col ${pill ? "glass rounded-full" : "glass-thick overflow-hidden rounded-[28px]"}`}
      style={{
        ...(underKeyboard
          ? { top: keyboard.top + EDGE, height: window.innerHeight - keyboard.top - EDGE * 2 }
          : keyboard
            ? { top: keyboard.bottom - EDGE - visible, height: visible }
            : { bottom: `max(${EDGE}px, env(safe-area-inset-bottom))`, height: visible }),
        transition: dragVisible === null ? "height 320ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
      }}
    >
      <div
        className="shrink-0 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {!pill && (
          <div className="flex h-5 items-center justify-center">
            <div className="h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/25" />
          </div>
        )}
        <div ref={headerRef} className={pill ? "px-1 py-1" : "px-3 pb-2"}>
          {typeof header === "function" ? header(pill) : header}
        </div>
      </div>
      {!pill && (
        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
          {/* Room to scroll the last rows out from under the keyboard. */}
          <div className="pb-4" style={underKeyboard ? { paddingBottom: keyboard.height + 16 } : undefined}>
            {children}
          </div>
        </div>
      )}
    </section>
  );
}
