import {
  memo,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * An <svg> that can be dragged (pan) and zoomed (wheel / pinch, or the
 * corner buttons) inside its box. Works by changing the viewBox, so text and
 * strokes stay sharp. Double-click resets.
 */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_ZOOM = 8;
const BUTTON_STEP = 1.5;

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const BUTTON_CLASS =
  "inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-text-dim hover:bg-gray-el-bg hover:text-gray-text";

export const PanZoomSvg = memo(function PanZoomSvg({
  base,
  ariaLabel,
  children,
}: {
  /** the full drawing: what "fit" shows */
  base: Box;
  ariaLabel: string;
  children: ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<Box>(base);
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{
    px: number;
    py: number;
    start: Box;
    scale: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** Keep at least half the view over the drawing so it can't get lost. */
  const clampBox = useCallback(
    (b: Box): Box => {
      const x = Math.min(
        Math.max(b.x, base.x - b.w / 2),
        base.x + base.w - b.w / 2,
      );
      const y = Math.min(
        Math.max(b.y, base.y - b.h / 2),
        base.y + base.h - b.h / 2,
      );
      return { ...b, x, y };
    },
    [base],
  );

  /** Zoom by `factor` (>1 = in) keeping SVG point (cx, cy) fixed. */
  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      setView((v) => {
        const w = Math.min(base.w, Math.max(base.w / MAX_ZOOM, v.w / factor));
        if (w === base.w) return base;
        const k = w / v.w;
        const h = (w * base.h) / base.w;
        return clampBox({
          x: cx - (cx - v.x) * k,
          y: cy - (cy - v.y) * k,
          w,
          h,
        });
      });
    },
    [base, clampBox],
  );

  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // wheel needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvgPoint(e.clientX, e.clientY);
      if (!p) return;
      // trackpad pinch arrives as ctrl+wheel with small deltas
      const speed = e.ctrlKey ? 0.01 : 0.0015;
      zoomAt(Math.exp(-e.deltaY * speed), p.x, p.y);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toSvgPoint, zoomAt]);

  const onPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      start: viewRef.current,
      scale: ctm.a,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      if (!d) return;
      const dx = (e.clientX - d.px) / d.scale;
      const dy = (e.clientY - d.py) / d.scale;
      setView(clampBox({ ...d.start, x: d.start.x - dx, y: d.start.y - dy }));
    },
    [clampBox],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
    setDragging(false);
  }, []);

  const reset = useCallback(() => setView(base), [base]);
  const zoomButton = useCallback(
    (factor: number) => {
      const v = viewRef.current;
      zoomAt(factor, v.x + v.w / 2, v.y + v.h / 2);
    },
    [zoomAt],
  );
  const zoomIn = useCallback(() => zoomButton(BUTTON_STEP), [zoomButton]);
  const zoomOut = useCallback(() => zoomButton(1 / BUTTON_STEP), [zoomButton]);

  const zoom = base.w / view.w;

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={`w-full h-full touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={reset}
      >
        {children}
      </svg>
      <div className="absolute flex items-center rounded-lg bottom-3 right-3 p-0.5 gap-0.5 bg-gray-bg-2">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= 1}
          aria-label="Zoom out"
          title="Zoom out"
          className={`${BUTTON_CLASS} disabled:opacity-40`}
        >
          <svg {...ICON_PROPS}>
            <path d="M3 7h8" />
          </svg>
        </button>
        <span className="w-10 text-xs text-center tabular-nums text-gray-text-dim">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          title="Zoom in (or scroll)"
          className={`${BUTTON_CLASS} disabled:opacity-40`}
        >
          <svg {...ICON_PROPS}>
            <path d="M3 7h8M7 3v8" />
          </svg>
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={view === base}
          aria-label="Reset view"
          title="Reset view (double-click)"
          className="inline-flex items-center px-2 text-xs font-medium h-7 rounded-md gap-1 text-gray-text-dim hover:bg-gray-el-bg hover:text-gray-text disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <svg {...ICON_PROPS}>
            <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M2.5 2.5v2.5H5" />
          </svg>
          Reset view
        </button>
      </div>
    </div>
  );
});
