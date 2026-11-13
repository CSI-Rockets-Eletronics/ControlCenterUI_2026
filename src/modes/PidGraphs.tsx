import { memo, useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  COPV_PURPLE,
  decimate,
  OXTANK_COLOR,
  themed,
  useTelemetryStore,
  useThrottledTelemetryVersion,
} from "@/stores/telemetryStore";

/**
 * Left half of the P&ID "Graphs" view: stacked line graphs, one color per
 * signal. The diagram on the right draws each number in the same color as
 * its line (see `pidColor`).
 */

export type PidSignal =
  | "copv_1_psi"
  | "copv_2_psi"
  | "oxtank_1_psi"
  | "oxtank_2_psi"
  | "pilot_pres_psi"
  | "qd_pres_psi"
  | "cap_fill_base";

/** One distinct color per signal, light / dark. COPV 1 and Oxtank 1 keep
 *  their Live telemetry colors. */
const PID_COLORS: Record<PidSignal, { light: string; dark: string }> = {
  copv_1_psi: COPV_PURPLE,
  copv_2_psi: { light: "#db2777", dark: "#f472b6" },
  oxtank_1_psi: OXTANK_COLOR,
  oxtank_2_psi: { light: "#ea580c", dark: "#fb923c" },
  pilot_pres_psi: { light: "#16a34a", dark: "#4ade80" },
  qd_pres_psi: { light: "#2563eb", dark: "#60a5fa" },
  cap_fill_base: { light: "#0d9488", dark: "#2dd4bf" },
};

/** Current-theme color for a P&ID signal. Read at render time. */
export const pidColor = (signal: PidSignal) => themed(PID_COLORS[signal]);

interface GraphConfig {
  title: string;
  unit: string;
  signals: { key: PidSignal; label: string }[];
  domain?: [number, number];
}

const GRAPHS: GraphConfig[] = [
  {
    title: "COPV",
    unit: "psi",
    signals: [
      { key: "copv_1_psi", label: "COPV 1" },
      { key: "copv_2_psi", label: "COPV 2" },
    ],
  },
  {
    title: "Oxtank",
    unit: "psi",
    signals: [
      { key: "oxtank_1_psi", label: "Oxtank 1" },
      { key: "oxtank_2_psi", label: "Oxtank 2" },
    ],
  },
  {
    title: "Pilot and QD",
    unit: "psi",
    signals: [
      { key: "pilot_pres_psi", label: "Pilot" },
      { key: "qd_pres_psi", label: "QD" },
    ],
  },
  {
    title: "LOX level",
    unit: "%",
    signals: [{ key: "cap_fill_base", label: "Level" }],
    domain: [0, 100],
  },
];

const TIME_RANGE_SECONDS = 120;
const TICK_STYLE = { fontSize: 10 } as const;
const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "rgb(var(--gray-bg-1))",
  border: "none",
  borderRadius: "4px",
  fontSize: "11px",
} as const;
const X_DOMAIN: [number, number] = [-TIME_RANGE_SECONDS, 0];
const AUTO_DOMAIN = ["auto", "auto"] as [string, string];

/** toFixed without "-0" for small negatives around zero. */
const fix = (v: number, digits: number) =>
  v.toFixed(digits).replace(/^-(0(\.0+)?)$/, "$1");

const formatTime = (t: number) => `${Math.round(t)}s`;

const PidGraph = memo(function PidGraph({ config }: { config: GraphConfig }) {
  // redraw at most ~5x/s, not on every data batch
  const tick = useThrottledTelemetryVersion();

  const { data, latest } = useMemo(() => {
    const now = Date.now() * 1000;
    const start = now - TIME_RANGE_SECONDS * 1e6;
    const store = useTelemetryStore.getState();
    const rows = new Map<number, Record<string, number>>();
    const last: Record<string, number | null> = {};
    for (const { key } of config.signals) {
      const samples = store.getSamples(key, start, now);
      last[key] = samples[samples.length - 1]?.value ?? null;
      for (const s of samples) {
        let row = rows.get(s.timestamp);
        if (!row) {
          row = { time: (s.timestamp - now) / 1e6 };
          rows.set(s.timestamp, row);
        }
        row[key] = s.value;
      }
    }
    const sorted = Array.from(rows.values()).sort((a, b) => a.time - b.time);
    return { data: decimate(sorted), latest: last };
    // tick: recompute when the throttled telemetry version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, tick]);

  return (
    <div className="flex flex-col min-h-0 p-3 ui-card">
      <div className="flex flex-wrap items-baseline justify-between mb-1 gap-x-3">
        <h3 className="font-medium text-[15px] tracking-[-0.01em] text-gray-text">
          {config.title}
        </h3>
        <div className="flex flex-wrap items-baseline gap-x-4 whitespace-nowrap">
          {config.signals.map(({ key, label }) => (
            <span key={key} className="inline-flex items-baseline gap-1.5">
              <span
                className="self-center w-3 rounded-full h-0.5"
                style={{ background: pidColor(key) }}
              />
              <span className="text-xs text-gray-text-dim">{label}</span>
              <span
                className="text-lg font-normal tabular-nums"
                style={{ color: pidColor(key) }}
              >
                {latest[key] === null ? "--" : fix(latest[key]!, 0)}
              </span>
              <span className="text-xs text-gray-text-dim">{config.unit}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-text-dim">
            Waiting for data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="time"
                type="number"
                domain={X_DOMAIN}
                stroke="#666"
                tick={TICK_STYLE}
                tickFormatter={formatTime}
                tickCount={5}
              />
              <YAxis
                stroke="#666"
                tick={TICK_STYLE}
                tickCount={4}
                width={40}
                domain={config.domain ?? AUTO_DOMAIN}
              />
              <Tooltip
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelFormatter={formatTime}
              />
              {config.signals.map(({ key, label }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={pidColor(key)}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

export const PidGraphs = memo(function PidGraphs() {
  return (
    <div className="h-full min-h-0 p-4 grid ui-section grid-rows-4 gap-2">
      {GRAPHS.map((g) => (
        <PidGraph key={g.title} config={g} />
      ))}
    </div>
  );
});
