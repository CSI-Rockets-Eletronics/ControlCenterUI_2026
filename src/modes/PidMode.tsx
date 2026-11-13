/* eslint-disable react-perf/jsx-no-new-array-as-prop */
import {
  createContext,
  isValidElement,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";
import { type SignalType, useTelemetryStore } from "@/stores/telemetryStore";
import { type PidView, useViewPrefsStore } from "@/stores/viewPrefsStore";

import { pidColor, PidGraphs } from "./PidGraphs";

/**
 * Live P&ID, redrawn from public/Fluids 25-26 P&ID-Main.png.
 * Focus for now: tank contents.
 *   - LOX tank: liquid level from the capacitive fill sensor (cap_fill_base, %; firmware does not clamp)
 *   - COPV: gas, so its volume is fixed; fill shows pressure as % of 4500 psi rating
 *   - GN2 supply bottle (GSE): no sensor, drawn without a level
 */

const COPV_RATED_PSI = 4500;
const LOX_TANK_RATED_PSI = 450;

function useLatest(signal: SignalType): number | null {
  // buffers map is replaced on each append, so this re-renders with new data
  useTelemetryStore((s) => s.buffers);
  return useTelemetryStore.getState().getLatestSample(signal)?.value ?? null;
}

/** "filling" / "draining" when a signal moved more than `minChange` over ~2 s. */
function useTrend(signal: SignalType, minChange: number): Trend {
  useTelemetryStore((s) => s.buffers);
  const now = Date.now() * 1000;
  const samples = useTelemetryStore
    .getState()
    .getSamples(signal, now - 2e6, now);
  if (samples.length < 2) return null;
  const delta = samples[samples.length - 1].value - samples[0].value;
  return delta > minChange ? "filling" : delta < -minChange ? "draining" : null;
}

type Trend = "filling" | "draining" | null;

const avg = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : (a + b) / 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const fmt = (v: number | null, d = 0) => {
  if (v === null) return "--";
  const out = v.toFixed(d);
  // tiny negatives like -0.3 round to "-0"; show plain "0"
  return /^-0(\.0+)?$/.test(out) ? out.slice(1) : out;
};

type Relays = Partial<
  Record<
    | "gn2_drain"
    | "gn2_fill"
    | "depress"
    | "press_pilot"
    | "run"
    | "lox_fill"
    | "lox_disconnect"
    | "igniter"
    | "igniter_backup",
    boolean
  >
>;

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tank fill: pure black (light mode) / pure white (dark mode). */
const THEME_FILL = "theme";

const ON_FILL_LIGHT = "#ffffff";
const ON_FILL_DARK = "#0b1b2b";

/** Whichever of white / near-black has the higher contrast on `hex`. */
function textColorOn(hex: string) {
  const l = luminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastDark = (l + 0.05) / (luminance(ON_FILL_DARK) + 0.05);
  return contrastWhite >= contrastDark ? ON_FILL_LIGHT : ON_FILL_DARK;
}

/** Vertical capsule tank with a liquid/gas fill from the bottom. */
function Tank({
  id,
  x,
  y,
  w,
  h,
  fill,
  color,
  title,
  lines,
  trend = null,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1, or null when unmeasured */
  fill: number | null;
  color: string;
  title: string[];
  lines: string[];
  trend?: Trend;
}) {
  // corner radius: rounded rectangle, not a full capsule
  const r = Math.min(w * 0.3, 36);
  const narrow = w < 100;
  const level = fill === null ? 0 : clamp01(fill);
  const fillH = h * level;
  // THEME_FILL: pure black with white text (light), pure white with black
  // text (dark); colors come from --tank-fill / --tank-text
  const themed = color === THEME_FILL;
  const fillCss = themed ? "rgb(var(--tank-fill))" : color;
  const onFill = themed ? "rgb(var(--tank-text))" : textColorOn(color);

  /** Title + readouts. `color` undefined = normal theme text colors. */
  const labels = (onColor: string | undefined) => (
    <>
      {/* Title sits near the bottom of the rounded cap, where the tank is
          close to full width, so it doesn't touch the walls. */}
      {title.map((t, i) => (
        <text
          key={t}
          x={x + w / 2}
          y={y + Math.max(r, 30) + 4 + i * 16}
          textAnchor="middle"
          className={`font-normal ${onColor ? "" : "fill-gray-text"} ${narrow ? "text-[12px]" : "text-[13px]"}`}
          style={onColor ? { fill: onColor } : undefined}
        >
          {t}
        </text>
      ))}
      {lines.map((t, i) => (
        <text
          key={t + i}
          x={x + w / 2}
          y={y + h / 2 + 4 + i * 22}
          textAnchor="middle"
          className={
            i === 0
              ? `${onColor ? "" : "fill-gray-text"} font-normal ${narrow ? "text-[13px]" : "text-[18px]"}`
              : `${onColor ? "" : "fill-gray-text-dim"} text-[12px] font-medium`
          }
          fillOpacity={onColor && i > 0 ? 0.85 : undefined}
          style={{
            fontVariantNumeric: "tabular-nums",
            ...(onColor ? { fill: onColor } : {}),
          }}
        >
          {t}
        </text>
      ))}
    </>
  );

  return (
    <g>
      <defs>
        <clipPath id={`clip-${id}`}>
          <rect x={x} y={y} width={w} height={h} rx={r} ry={r} />
        </clipPath>
        {/* Labels are drawn twice: once clipped to the empty part (normal
            text color), once to the filled part (color chosen for contrast
            with the fill). The color switches exactly at the liquid line. */}
        <clipPath id={`empty-${id}`}>
          <rect x={x - 4} y={y - 4} width={w + 8} height={h - fillH + 4} />
        </clipPath>
        <clipPath id={`filled-${id}`}>
          <rect x={x - 4} y={y + h - fillH} width={w + 8} height={fillH + 4} />
        </clipPath>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: fillCss }} stopOpacity="1" />
          {/* solid (no fade) so the fill reads as one flat color */}
          <stop offset="1" style={{ stopColor: fillCss }} stopOpacity="1" />
        </linearGradient>
        <pattern
          id={`flow-${id}`}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="16" fill="white" opacity="0.18" />
          <animateTransform
            attributeName="patternTransform"
            type="translate"
            from="0 0"
            to={trend === "draining" ? "0 16" : "0 -16"}
            dur="0.8s"
            repeatCount="indefinite"
            additive="sum"
          />
        </pattern>
        <pattern
          id={`hatch-${id}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            className="stroke-gray-border"
            strokeWidth="2"
          />
        </pattern>
      </defs>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        className="fill-gray-bg-2"
      />
      {fill === null ? (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={`url(#hatch-${id})`}
          clipPath={`url(#clip-${id})`}
        />
      ) : (
        <g clipPath={`url(#clip-${id})`}>
          <rect
            x={x}
            y={y + h - fillH}
            width={w}
            height={fillH}
            fill={`url(#grad-${id})`}
            style={{ transition: "y 0.3s linear, height 0.3s linear" }}
          />
          {trend && (
            <rect
              x={x}
              y={y + h - fillH}
              width={w}
              height={fillH}
              fill={`url(#flow-${id})`}
              style={{ transition: "y 0.3s linear, height 0.3s linear" }}
            />
          )}
          {/* liquid surface */}
          {level > 0 && level < 1 && (
            <line
              x1={x}
              x2={x + w}
              y1={y + h - fillH}
              y2={y + h - fillH}
              strokeWidth="3"
              style={{
                stroke: fillCss,
                transition: "y1 0.3s linear, y2 0.3s linear",
              }}
            />
          )}
        </g>
      )}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="none"
        className="stroke-gray-text"
        strokeWidth="2"
      />
      {trend && (
        <text
          x={x + w / 2}
          y={y - 8}
          textAnchor="middle"
          className="font-semibold text-[12px]"
          fill={trend === "filling" ? "#37b24d" : "#f59f00"}
        >
          {trend === "filling" ? "▲ Filling" : "▼ Draining"}
        </text>
      )}
      <g clipPath={`url(#empty-${id})`}>{labels(undefined)}</g>
      {fill !== null && fillH > 0 && (
        <g clipPath={`url(#filled-${id})`}>{labels(onFill)}</g>
      )}
    </g>
  );
}

/** Two-triangle valve symbol, green when open. */
function Valve({
  x,
  y,
  open,
  label,
  vertical = false,
  labelSide = "right",
}: {
  x: number;
  y: number;
  open: boolean | undefined;
  label: string;
  vertical?: boolean;
  labelSide?: "right" | "left" | "below";
}) {
  const s = 12;
  const color = open === undefined ? "#9ca3af" : open ? "#37b24d" : "#f03e3e";
  // Standard bowtie: two triangles meeting at the center, bases across the
  // pipe. (The old horizontal point order drew a crossed "X" instead.)
  const d = vertical
    ? `M${x - s},${y - s} L${x + s},${y - s} L${x},${y} Z M${x - s},${y + s} L${x + s},${y + s} L${x},${y} Z`
    : `M${x - s},${y - s} L${x - s},${y + s} L${x},${y} Z M${x + s},${y - s} L${x + s},${y + s} L${x},${y} Z`;
  const lx =
    labelSide === "left" ? x - s - 8 : labelSide === "below" ? x : x + s + 8;
  const ly = labelSide === "below" ? y + s + 16 : y + 4;
  return (
    <g>
      {/* solid backing in the panel color hides the pipe inside the valve,
          so lines stop at the valve's border */}
      <path d={d} style={{ fill: "rgb(var(--gray-section))" }} />
      <path
        d={d}
        fill={color}
        fillOpacity={open ? 0.35 : 0.15}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x={lx}
        y={ly}
        textAnchor={
          labelSide === "left"
            ? "end"
            : labelSide === "below"
              ? "middle"
              : "start"
        }
        className="fill-gray-text text-[12px]"
      >
        {label}
        <tspan className="fill-gray-text-dim">
          {open === undefined ? "" : open ? " · open" : " · closed"}
        </tspan>
      </text>
    </g>
  );
}

/** Pressure transducer bubble with a live reading. */
function Gauge({
  x,
  y,
  label,
  value,
  unit = "psi",
  color,
}: {
  x: number;
  y: number;
  label: string;
  value: number | null;
  unit?: string;
  /** Graphs view: ring and number in the signal's line color */
  color?: string;
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={30}
        className={`fill-gray-bg-2 ${color ? "" : "stroke-gray-text"}`}
        style={color ? { stroke: color } : undefined}
        strokeWidth={color ? 2.5 : 2}
      />
      <text
        x={x}
        y={y - 6}
        textAnchor="middle"
        className="fill-gray-text-dim text-[10px]"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        className={`font-normal text-[13px] ${color ? "" : "fill-gray-text"}`}
        style={{
          fontVariantNumeric: "tabular-nums",
          ...(color ? { fill: color } : {}),
        }}
      >
        {fmt(value)}
      </text>
      <text
        x={x}
        y={y + 44}
        textAnchor="middle"
        className="fill-gray-text-dim text-[10px]"
      >
        {unit}
      </text>
    </g>
  );
}

const Line = ({ d }: { d: string }) => (
  <path d={d} fill="none" className="stroke-gray-text" strokeWidth="2" />
);

/** One label/value row in the side tables. */
/** Which table row is hovered (an id), shared with the diagram. */
const HoverCtx = createContext<{
  hover: string | null;
  setHover: (id: string | null) => void;
}>({ hover: null, setHover: () => undefined });

/** Table row id -> diagram parts to enlarge. Valve rows use `valve-<key>`. */
const HL_MAP: Record<string, string[]> = {
  // each sensor row highlights its own gauge plus the tank it measures
  copv1: ["tank-copv", "gauge-copv1"],
  copv2: ["tank-copv", "gauge-copv2"],
  oxtank1: ["tank-lox", "gauge-oxtank1"],
  oxtank2: ["tank-lox", "gauge-oxtank2"],
  pilot: ["gauge-pilot"],
  qd: ["gauge-qd"],
  lox: ["tank-lox"],
  ereg: ["ereg"],
};

/**
 * Wraps a diagram part; scales it up while its table row is hovered. Scales
 * around the symbol's own center (valve/gauge x,y; tank middle), not the
 * group's box, so labels beside it don't pull it off its pipe.
 */
function Hl({
  id,
  children,
  cx,
  cy,
}: {
  id: string;
  children: ReactNode;
  cx?: number;
  cy?: number;
}) {
  const { hover } = useContext(HoverCtx);
  const on = hover !== null && (hover === id || !!HL_MAP[hover]?.includes(id));
  const p = (isValidElement(children) ? children.props : {}) as {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  };
  const ox = cx ?? (p.x ?? 0) + (p.w ?? 0) / 2;
  const oy = cy ?? (p.y ?? 0) + (p.h ?? 0) / 2;
  return (
    <g
      className={`pid-hl ${on ? "is-hl" : ""}`}
      style={{ transformOrigin: `${ox}px ${oy}px` }}
    >
      {children}
    </g>
  );
}

function Row({
  label,
  value,
  unit,
  hl,
}: {
  label: string;
  value: string;
  unit?: string;
  /** id of the diagram part(s) to enlarge on hover */
  hl?: string;
}) {
  const { setHover } = useContext(HoverCtx);
  const enter = useCallback(() => setHover(hl ?? null), [setHover, hl]);
  const leave = useCallback(() => setHover(null), [setHover]);
  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      className="flex items-center justify-between flex-1 px-2 py-2 -mx-2 rounded-md hover:bg-gray-el-bg-hover"
    >
      <span className="text-sm text-gray-text-dim">{label}</span>
      <span className="text-sm font-normal tabular-nums text-gray-text">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-gray-text-dim">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function ValveRow({
  id,
  label,
  open,
}: {
  id: string;
  label: string;
  open: boolean | undefined;
}) {
  const { setHover } = useContext(HoverCtx);
  const enter = useCallback(() => setHover(id), [setHover, id]);
  const leave = useCallback(() => setHover(null), [setHover]);
  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      className="flex items-center justify-between flex-1 px-2 py-2 -mx-2 rounded-md hover:bg-gray-el-bg-hover"
    >
      <span className="text-sm text-gray-text-dim">{label}</span>
      <span
        className={`w-16 py-0.5 text-center text-xs font-semibold rounded-md ${
          open === undefined
            ? "text-gray-text-dim"
            : open
              ? "ui-open"
              : "bg-red-solid text-white"
        }`}
      >
        {open === undefined ? "--" : open ? "Open" : "Closed"}
      </span>
    </div>
  );
}

const VALVE_ROWS = [
  ["press_pilot", "Press Pilot"],
  ["depress", "Depress"],
  ["run", "Run"],
  ["gn2_fill", "GN2 Fill"],
  ["gn2_drain", "GN2 Drain"],
  ["lox_fill", "LOX Fill"],
  ["lox_disconnect", "LOX Disconnect"],
  ["igniter", "Igniter"],
  ["igniter_backup", "Igniter Backup"],
] as const;

function usePidData() {
  const copv = avg(useLatest("copv_1_psi"), useLatest("copv_2_psi"));
  const oxtank = avg(useLatest("oxtank_1_psi"), useLatest("oxtank_2_psi"));
  const loxRaw = useLatest("cap_fill_base");
  // firmware percent is unclamped (negative below empty, >100 is possible)
  const loxLevel = loxRaw === null ? null : Math.min(100, Math.max(0, loxRaw));
  const pilot = useLatest("pilot_pres_psi");
  const loxTrend = useTrend("cap_fill_base", 0.8);
  const copvTrend = useTrend("copv_1_psi", 15);
  const qd = useLatest("qd_pres_psi");
  const copv1 = useLatest("copv_1_psi");
  const copv2 = useLatest("copv_2_psi");
  const oxtank1 = useLatest("oxtank_1_psi");
  const oxtank2 = useLatest("oxtank_2_psi");
  const fsState = useLaunchMachineSelector(
    (s) => s.context.deviceStates.fsState?.data.state,
  );

  const relays = useLaunchMachineSelector(
    (s) => s.context.deviceStates.fsState?.data as Relays | undefined,
  );
  const ereg = useLaunchMachineSelector(
    (s) => s.context.deviceStates.fsLoxGn2Transducers?.data,
  );
  const eregLabel = ereg?.ereg_stage_2
    ? "Stage 2"
    : ereg?.ereg_stage_1
      ? "Stage 1"
      : ereg?.ereg_closed
        ? "Closed"
        : "--";

  return {
    copv,
    oxtank,
    loxLevel,
    pilot,
    loxTrend,
    copvTrend,
    qd,
    copv1,
    copv2,
    oxtank1,
    oxtank2,
    fsState,
    relays,
    eregLabel,
  };
}

/** Left column of the Tables view: live values and valve states. */
const PidTables = memo(function PidTables() {
  const {
    loxLevel,
    pilot,
    qd,
    copv1,
    copv2,
    oxtank1,
    oxtank2,
    fsState,
    relays,
    eregLabel,
  } = usePidData();
  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto gap-2">
      {/* both tables share the column height; rows spread to fill it */}
      <div className="flex flex-col flex-1 p-4 ui-section">
        <h2 className="mb-1 ui-section-title">Readings</h2>
        <div className="flex flex-col flex-1 divide-y divide-gray-border">
          <Row label="COPV 1" value={fmt(copv1)} unit="psi" hl="copv1" />
          <Row label="COPV 2" value={fmt(copv2)} unit="psi" hl="copv2" />
          <Row label="Oxtank 1" value={fmt(oxtank1)} unit="psi" hl="oxtank1" />
          <Row label="Oxtank 2" value={fmt(oxtank2)} unit="psi" hl="oxtank2" />
          <Row label="Pilot" value={fmt(pilot)} unit="psi" hl="pilot" />
          <Row label="QD" value={fmt(qd)} unit="psi" hl="qd" />
          <Row label="LOX level" value={fmt(loxLevel)} unit="%" hl="lox" />
          <Row label="E-Reg" value={eregLabel} hl="ereg" />
          <Row label="Station state" value={fsState ?? "--"} />
        </div>
      </div>
      <div className="flex flex-col flex-1 p-4 ui-section">
        <h2 className="mb-1 ui-section-title">Valves</h2>
        <div className="flex flex-col flex-1 divide-y divide-gray-border">
          {VALVE_ROWS.map(([key, label]) => (
            <ValveRow
              key={key}
              id={`valve-${key}`}
              label={label}
              open={relays?.[key]}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * The live diagram. `colored` (Graphs view): gauges and the LOX tank use the
 * same color as their line in the graphs on the left.
 */
const PidDiagram = memo(function PidDiagram({ colored }: { colored: boolean }) {
  const {
    copv,
    oxtank,
    loxLevel,
    pilot,
    loxTrend,
    copvTrend,
    qd,
    copv1,
    copv2,
    oxtank1,
    oxtank2,
    relays,
    eregLabel,
  } = usePidData();
  const c = (signal: Parameters<typeof pidColor>[0]) =>
    colored ? pidColor(signal) : undefined;
  return (
    <svg
      viewBox="0 -20 1080 780"
      className="w-full h-full"
      role="img"
      aria-label="Live fluids P&ID"
    >
      {/* Regions */}
      <rect
        x="20"
        y="20"
        width="560"
        height="720"
        rx="40"
        fill="none"
        className="stroke-gray-solid"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <text
        x="300"
        y="-6"
        textAnchor="middle"
        className="font-medium fill-gray-text text-[14px]"
      >
        Vehicle
      </text>
      <rect
        x="720"
        y="20"
        width="340"
        height="420"
        rx="40"
        fill="none"
        className="stroke-gray-solid"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <text
        x="890"
        y="-6"
        textAnchor="middle"
        className="font-medium fill-gray-text text-[14px]"
      >
        Ground support equipment
      </text>

      {/* Plumbing */}
      <Line d="M300 220 V280" />
      {/* COPV -> ereg */}
      <Line d="M300 320 V360" />
      {/* ereg -> LOX tank */}
      <Line d="M300 250 H140 V318" />
      {/* COPV -> pilot */}
      <Line d="M140 342 V420 H112" />
      {/* pilot -> depress */}
      <Line d="M300 660 V678" />
      {/* LOX tank -> run valve area */}
      <Line d="M300 250 H780" />
      {/* COPV -> GN2 QD -> GSE */}
      <Line d="M780 250 V140 H848" />
      <Line d="M872 140 H960 V170" />
      {/* fill solenoid -> supply */}
      <Line d="M780 250 V318" />
      {/* drain */}
      <Line d="M300 600 H460 V560 H780 V422" />
      {/* LOX line -> GSE LOX */}

      {/* gauge connectors: drawn with the pipes, under every symbol, so an
                  enlarged tank or gauge covers them instead of being crossed */}
      <line
        x1="360"
        y1="150"
        x2="480"
        y2="150"
        className="stroke-gray-text"
        strokeWidth="2"
      />
      <line
        x1="360"
        y1="480"
        x2="480"
        y2="480"
        className="stroke-gray-text"
        strokeWidth="2"
      />
      <line
        x1="100"
        y1="250"
        x2="140"
        y2="250"
        className="stroke-gray-text"
        strokeWidth="2"
      />
      {/* Sensors */}

      {/* Tanks */}
      <Hl id="tank-copv">
        <Tank
          id="copv"
          x={240}
          y={50}
          w={120}
          h={170}
          fill={copv === null ? null : copv / COPV_RATED_PSI}
          color={THEME_FILL}
          trend={copvTrend}
          title={["Nitrogen COPV"]}
          lines={[
            `${fmt(copv)} psi`,
            `${fmt(copv === null ? null : (100 * copv) / COPV_RATED_PSI)}% of rated`,
          ]}
        />
      </Hl>
      <Hl id="tank-lox">
        <Tank
          id="lox"
          x={240}
          y={360}
          w={120}
          h={300}
          fill={loxLevel === null ? null : loxLevel / 100}
          color={c("cap_fill_base") ?? THEME_FILL}
          trend={loxTrend}
          title={["Liquid oxygen", "tank"]}
          lines={[
            `${fmt(loxLevel)}% full`,
            `${fmt(oxtank)} psi (max ${LOX_TANK_RATED_PSI})`,
          ]}
        />
      </Hl>
      <Tank
        id="supply"
        x={925}
        y={170}
        w={70}
        h={200}
        fill={null}
        color="#9ca3af"
        title={["GN2", "supply"]}
        lines={["no sensor"]}
      />

      {/* E-Reg */}
      <Hl id="ereg" cx={300} cy={300}>
        <rect
          x="280"
          y="280"
          width="40"
          height="40"
          rx="6"
          className="fill-gray-bg-2 stroke-gray-text"
          strokeWidth="2"
        />
        <text
          x="300"
          y="305"
          textAnchor="middle"
          className="font-bold fill-gray-text text-[13px]"
        >
          M
        </text>
        {/* same "Name · state" style as the valve labels */}
        <text x="330" y="304" className="fill-gray-text text-[12px]">
          E-Reg
          <tspan className="fill-gray-text-dim">
            {" · "}
            {eregLabel.toLowerCase()}
          </tspan>
        </text>
      </Hl>

      {/* Valves */}
      <Hl id="valve-press_pilot">
        <Valve
          x={140}
          y={330}
          open={relays?.press_pilot}
          label="Press Pilot"
          vertical
        />
      </Hl>
      <Hl id="valve-depress">
        <Valve
          x={100}
          y={420}
          open={relays?.depress}
          label="Depress"
          labelSide="below"
        />
      </Hl>
      <Hl id="valve-run">
        <Valve x={300} y={690} open={relays?.run} label="Run" vertical />
      </Hl>
      <Hl id="valve-gn2_fill">
        <Valve
          x={860}
          y={140}
          open={relays?.gn2_fill}
          label="GN2 Fill"
          labelSide="below"
        />
      </Hl>
      <Hl id="valve-gn2_drain">
        <Valve
          x={780}
          y={330}
          open={relays?.gn2_drain}
          label="Drain"
          vertical
        />
      </Hl>
      <Hl id="valve-lox_disconnect">
        <Valve
          x={780}
          y={410}
          open={relays?.lox_disconnect}
          label="LOX Disconnect"
          vertical
        />
      </Hl>
      <Hl id="valve-lox_fill">
        <Valve
          x={650}
          y={560}
          open={relays?.lox_fill}
          label="LOX Fill"
          labelSide="below"
        />
      </Hl>

      {/* two transducers each: COPV 1/2 and Oxtank 1/2 */}
      <Hl id="gauge-copv1">
        <Gauge
          x={430}
          y={150}
          label="COPV 1"
          value={copv1}
          color={c("copv_1_psi")}
        />
      </Hl>
      <Hl id="gauge-copv2">
        <Gauge
          x={510}
          y={150}
          label="COPV 2"
          value={copv2}
          color={c("copv_2_psi")}
        />
      </Hl>
      <Hl id="gauge-oxtank1">
        <Gauge
          x={430}
          y={480}
          label="Oxtank 1"
          value={oxtank1}
          color={c("oxtank_1_psi")}
        />
      </Hl>
      <Hl id="gauge-oxtank2">
        <Gauge
          x={510}
          y={480}
          label="Oxtank 2"
          value={oxtank2}
          color={c("oxtank_2_psi")}
        />
      </Hl>
      <Hl id="gauge-pilot">
        <Gauge
          x={70}
          y={250}
          label="Pilot"
          value={pilot}
          color={c("pilot_pres_psi")}
        />
      </Hl>
      <Hl id="gauge-qd">
        <Gauge x={650} y={250} label="QD" value={qd} color={c("qd_pres_psi")} />
      </Hl>
    </svg>
  );
});

const PID_VIEWS: { key: PidView; label: string }[] = [
  { key: "tables", label: "Tables" },
  { key: "graphs", label: "Graphs" },
];

const ViewTab = memo(function ViewTab({
  view,
  label,
  selected,
  onSelect,
}: {
  view: PidView;
  label: string;
  selected: boolean;
  onSelect: (view: PidView) => void;
}) {
  const handleClick = useCallback(() => onSelect(view), [onSelect, view]);
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={handleClick}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
        selected ? "ui-selected" : "text-gray-text-dim hover:text-gray-text"
      }`}
    >
      {label}
    </button>
  );
});

export const PidMode = memo(function PidMode() {
  const [hover, setHover] = useState<string | null>(null);
  const hoverCtx = useMemo(() => ({ hover, setHover }), [hover]);
  const view = useViewPrefsStore((s) => s.pidView);
  const setView = useViewPrefsStore((s) => s.setPidView);
  const graphs = view === "graphs";

  return (
    <HoverCtx.Provider value={hoverCtx}>
      <div
        className={`h-full p-4 grid gap-2 ${graphs ? "grid-cols-2" : "grid-cols-[300px,1fr]"}`}
      >
        {graphs ? <PidGraphs /> : <PidTables />}

        {/* Right: diagram. The layout toggle lives here so it stays put
            when switching views. */}
        <div className="flex flex-col h-full min-h-0 p-4 ui-section">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="ui-section-title"
              title={`COPV fill = pressure vs ${COPV_RATED_PSI} psi rating · LOX fill = capacitive level sensor`}
            >
              P&amp;ID
            </h2>
            <div
              role="tablist"
              aria-label="P&ID layout"
              className="flex p-1 rounded-lg bg-gray-el-bg gap-1"
            >
              {PID_VIEWS.map((v) => (
                <ViewTab
                  key={v.key}
                  view={v.key}
                  label={v.label}
                  selected={view === v.key}
                  onSelect={setView}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <PidDiagram colored={graphs} />
          </div>
        </div>
      </div>
    </HoverCtx.Provider>
  );
});
