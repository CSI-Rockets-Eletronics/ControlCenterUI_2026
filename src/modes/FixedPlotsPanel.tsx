import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  decimate,
  SIGNAL_METADATA,
  useTelemetryStore,
  useThrottledTelemetryVersion,
} from "@/stores/telemetryStore";

import { PulseFill } from "./PulseFill";

/** Set by the panel: expand (in the grid) or close (in the popup). */
const PlotFrameCtx = createContext<{
  onExpand?: () => void;
  onClose?: () => void;
}>({});

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

function PlotHeader({ title, unit }: { title: string; unit: string }) {
  const { onExpand, onClose } = useContext(PlotFrameCtx);
  const action = onClose ?? onExpand;
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-medium text-[16px] tracking-[-0.01em] text-gray-text">
        {title}
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-text-dim">{unit}</span>
        {action && (
          <button
            type="button"
            onClick={action}
            aria-label={onClose ? `Close ${title}` : `Expand ${title}`}
            title={onClose ? "Close (Esc)" : "Expand"}
            className="inline-flex items-center justify-center w-6 h-6 -my-1 rounded-md text-gray-text-dim hover:bg-gray-el-bg hover:text-gray-text"
          >
            {onClose ? (
              <svg {...ICON_PROPS}>
                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
              </svg>
            ) : (
              <svg {...ICON_PROPS}>
                <path d="M8.5 2.5h3v3M11.5 2.5 8 6M5.5 11.5h-3v-3M2.5 11.5 6 8" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

const SECONDARY_DASH = "6 3";
const FILL_LEVEL_DOMAIN: [number, number] = [0, 100];

const COPV_CONFIG = {
  title: "COPV Pressure",
  signals: ["copv_1_psi", "copv_2_psi"] as const,
  unit: "PSI",
};

const OXTANK_CONFIG = {
  title: "Oxtank Pressure",
  signals: ["oxtank_1_psi", "oxtank_2_psi"] as const,
  unit: "PSI",
};

const MULTI_SIGNAL_CONFIGS = [
  {
    title: "Temperature",
    signals: [
      "gn2_internal_temp_c",
      "gn2_external_temp_c",
      "lox_upper_temp_c",
      "lox_lower_temp_c",
      "cap_fill_board_temp_c",
    ] as const,
    unit: "°C",
  },
  {
    title: "Load Cells",
    signals: ["load_cell_1_lbs", "load_cell_2_lbs"] as const,
    unit: "lbs",
  },
] as const;

const TIME_RANGE_SECONDS = 120;

// Charts stretch to fill their card (no fixed px heights) so the whole
// Live telemetry grid fits the window without scrolling.
const FILL_HEIGHT = { flex: "1 1 0px", minHeight: 0 } as const;

const X_AXIS_TICK_STYLE = { fontSize: 10 } as const;
const X_AXIS_LABEL = {
  value: "Time (s)",
  position: "insideBottom",
  offset: -5,
  fontSize: 10,
} as const;
const Y_AXIS_TICK_STYLE = { fontSize: 10 } as const;

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "rgb(var(--gray-bg-1))",
  border: "none",
  borderRadius: "4px",
  fontSize: "11px",
} as const;

const LEGEND_WRAPPER_STYLE = { fontSize: "10px" } as const;

/** toFixed without "-0" for small negatives around zero. */
const fix = (v: number, digits: number) =>
  v.toFixed(digits).replace(/^-(0(\.0+)?)$/, "$1");

const fillLevelTooltipFormatter = (value: number) => `${fix(value, 1)} %`;

const capBaseTooltipFormatter = (value: number) => `${fix(value, 3)} pF`;

type PressureConfig = typeof COPV_CONFIG | typeof OXTANK_CONFIG;

const PressurePlot = memo(function PressurePlot({
  config,
}: {
  config: PressureConfig;
}) {
  // redraw at most ~5x/s, not on every data batch
  const tick = useThrottledTelemetryVersion();

  const { chartData, latestValues } = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const allSamples = config.signals.map((signal) =>
      useTelemetryStore.getState().getSamples(signal, startTime, now),
    );

    const timestamps = new Set<number>();
    allSamples.forEach((samples) =>
      samples.forEach((s) => timestamps.add(s.timestamp)),
    );

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
    // timestamp -> value per signal (was an O(n^2) .find per point)
    const byTime = allSamples.map(
      (samples) => new Map(samples.map((s) => [s.timestamp, s.value])),
    );

    const data = sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, number> = {
        time: (timestamp - now) / 1e6,
      };
      config.signals.forEach((signal, idx) => {
        const value = byTime[idx].get(timestamp);
        if (value !== undefined) dataPoint[signal] = value;
      });
      return dataPoint;
    });

    const last = data[data.length - 1] ?? {};
    const latest: Record<string, number | null> = {};
    config.signals.forEach((signal) => {
      latest[signal] = last[signal] ?? null;
    });

    return { chartData: decimate(data), latestValues: latest };
    // tick: recompute when the throttled telemetry version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.signals, tick]);

  const hasData = chartData.length > 0;
  const accentColor = SIGNAL_METADATA[config.signals[0]].color;

  return (
    <div className="flex flex-col h-full min-h-0 p-3 ui-card">
      <PlotHeader title={config.title} unit={config.unit} />

      {!hasData && (
        <div
          style={FILL_HEIGHT}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for data...
        </div>
      )}

      {hasData && (
        <>
          <div
            className="flex"
            style={{ gap: 0, alignItems: "stretch", ...FILL_HEIGHT }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="time"
                    stroke="#666"
                    tick={X_AXIS_TICK_STYLE}
                    tickCount={3}
                    label={X_AXIS_LABEL}
                  />
                  <YAxis
                    stroke="#666"
                    tick={Y_AXIS_TICK_STYLE}
                    tickCount={5}
                    width={45}
                  />
                  <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} />
                  <Legend
                    wrapperStyle={LEGEND_WRAPPER_STYLE}
                    align="left"
                    verticalAlign="middle"
                    layout="vertical"
                    iconType="line"
                  />
                  {config.signals.map((signal, idx) => {
                    const dash = idx === 1 ? SECONDARY_DASH : undefined;
                    return (
                      <Line
                        key={signal}
                        type="monotone"
                        dataKey={signal}
                        name={SIGNAL_METADATA[signal].label}
                        stroke={SIGNAL_METADATA[signal].color}
                        strokeWidth={2}
                        strokeDasharray={dash}
                        dot={false}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              className="flex flex-col justify-center border-l gap-3 border-gray-border"
              style={{ paddingLeft: 14, marginLeft: 10, minWidth: 96 }}
            >
              {config.signals.map((signal) => {
                const val = latestValues[signal];
                return (
                  <div key={signal} className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <svg width="16" height="8" style={{ flexShrink: 0 }}>
                        {signal === config.signals[1] ? (
                          <line
                            x1="0"
                            y1="4"
                            x2="16"
                            y2="4"
                            stroke={accentColor}
                            strokeWidth="2"
                            strokeDasharray="4 2"
                          />
                        ) : (
                          <line
                            x1="0"
                            y1="4"
                            x2="16"
                            y2="4"
                            stroke={accentColor}
                            strokeWidth="2"
                          />
                        )}
                      </svg>
                      <span className="text-xs text-gray-text-dim">
                        {SIGNAL_METADATA[signal].label}
                      </span>
                    </div>
                    <span
                      className="font-normal tabular-nums"
                      style={{
                        fontSize: "2.25rem",
                        lineHeight: 1.1,
                        color: accentColor,
                      }}
                    >
                      {val !== null ? fix(val, 0) : "--"}
                    </span>
                    <span className="text-xs text-gray-text-dim">PSI</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

type MultiSignalConfig = (typeof MULTI_SIGNAL_CONFIGS)[number];

const MultiSignalPlot = memo(function MultiSignalPlot({
  config,
}: {
  config: MultiSignalConfig;
}) {
  // redraw at most ~5x/s, not on every data batch
  const tick = useThrottledTelemetryVersion();

  const chartData = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const allSamples = config.signals.map((signal) =>
      useTelemetryStore.getState().getSamples(signal, startTime, now),
    );

    const timestamps = new Set<number>();
    allSamples.forEach((samples) =>
      samples.forEach((s) => timestamps.add(s.timestamp)),
    );

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
    // timestamp -> value per signal (was an O(n^2) .find per point)
    const byTime = allSamples.map(
      (samples) => new Map(samples.map((s) => [s.timestamp, s.value])),
    );

    return decimate(
      sortedTimestamps.map((timestamp) => {
        const dataPoint: Record<string, number> = {
          time: (timestamp - now) / 1e6,
        };
        config.signals.forEach((signal, idx) => {
          const value = byTime[idx].get(timestamp);
          if (value !== undefined) dataPoint[signal] = value;
        });
        return dataPoint;
      }),
    );
    // tick: recompute when the throttled telemetry version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.signals, tick]);

  const hasData = chartData.length > 0;

  const compactFooter = config.signals.length > 2;

  return (
    <div className="flex flex-col h-full min-h-0 p-3 ui-card">
      <PlotHeader title={config.title} unit={config.unit} />

      {!hasData && (
        <div
          style={FILL_HEIGHT}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for data...
        </div>
      )}

      {hasData && (
        <>
          <div style={FILL_HEIGHT}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={X_AXIS_TICK_STYLE}
                  tickCount={3}
                  label={X_AXIS_LABEL}
                />
                <YAxis
                  stroke="#666"
                  tick={Y_AXIS_TICK_STYLE}
                  tickCount={5}
                  width={45}
                />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} />
                <Legend
                  wrapperStyle={LEGEND_WRAPPER_STYLE}
                  align="left"
                  verticalAlign="middle"
                  layout="vertical"
                  iconType="line"
                />
                {config.signals.map((signal) => (
                  <Line
                    key={signal}
                    type="monotone"
                    dataKey={signal}
                    name={SIGNAL_METADATA[signal].label}
                    stroke={SIGNAL_METADATA[signal].color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* one line: with many signals, drop names (colors match the legend) */}
          <div className="flex pt-2 mt-2 overflow-hidden border-t gap-3 border-gray-border whitespace-nowrap">
            {config.signals.map((signal) => {
              const latestValue =
                chartData.length > 0
                  ? chartData[chartData.length - 1][signal]
                  : null;
              return (
                <div key={signal} className="flex items-baseline gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: SIGNAL_METADATA[signal].color }}
                  />
                  {compactFooter ? null : (
                    <span className="text-xs text-gray-text-dim">
                      {SIGNAL_METADATA[signal].label}:
                    </span>
                  )}
                  <span className="text-sm font-normal text-gray-text tabular-nums">
                    {latestValue !== null && latestValue !== undefined
                      ? fix(latestValue, 1)
                      : "--"}
                  </span>
                  {compactFooter ? null : (
                    <span className="text-xs text-gray-text-dim">
                      {config.unit}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

const FillLevelPlot = memo(function FillLevelPlot() {
  // redraw at most ~5x/s, not on every data batch
  const tick = useThrottledTelemetryVersion();

  const { chartData, latestValue } = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const samples = useTelemetryStore
      .getState()
      .getSamples("cap_fill_base", startTime, now);
    const data = samples.map((s) => ({
      time: (s.timestamp - now) / 1e6,
      cap_fill_base: s.value,
    }));

    const latest = data.length > 0 ? data[data.length - 1].cap_fill_base : null;

    return { chartData: decimate(data), latestValue: latest };
    // tick: recompute when the throttled telemetry version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const hasData = chartData.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 p-3 ui-card">
      <PlotHeader title={"Cap Fill Height"} unit={"%"} />

      {!hasData && (
        <div
          style={FILL_HEIGHT}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for data...
        </div>
      )}

      {hasData && (
        <>
          <div style={FILL_HEIGHT}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={X_AXIS_TICK_STYLE}
                  tickCount={4}
                  label={X_AXIS_LABEL}
                />
                <YAxis
                  stroke="#666"
                  tick={Y_AXIS_TICK_STYLE}
                  tickCount={5}
                  width={40}
                  domain={FILL_LEVEL_DOMAIN}
                />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  formatter={fillLevelTooltipFormatter}
                />
                <Line
                  type="monotone"
                  dataKey="cap_fill_base"
                  name={SIGNAL_METADATA["cap_fill_base"].label}
                  stroke={SIGNAL_METADATA["cap_fill_base"].color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap pt-2 mt-2 border-t gap-3 border-gray-border">
            <div className="flex items-baseline gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: SIGNAL_METADATA["cap_fill_base"].color,
                }}
              />
              <span className="text-xs text-gray-text-dim">
                Cap fill height:
              </span>
              <span className="text-sm font-normal text-gray-text tabular-nums">
                {latestValue !== null ? fix(latestValue, 1) : "--"}
              </span>
              <span className="text-xs text-gray-text-dim">%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

const CapBasePlot = memo(function CapBasePlot() {
  // redraw at most ~5x/s, not on every data batch
  const tick = useThrottledTelemetryVersion();

  const { chartData, latestValue } = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const samples = useTelemetryStore
      .getState()
      .getSamples("cap_fill_actual", startTime, now);
    const data = samples.map((s) => ({
      time: (s.timestamp - now) / 1e6,
      cap_fill_actual: s.value,
    }));

    const latest =
      data.length > 0 ? data[data.length - 1].cap_fill_actual : null;

    return { chartData: decimate(data), latestValue: latest };
    // tick: recompute when the throttled telemetry version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const hasData = chartData.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 p-3 ui-card">
      <PlotHeader title={"Cap Fill Capacitance"} unit={"pF"} />

      {!hasData && (
        <div
          style={FILL_HEIGHT}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for data...
        </div>
      )}

      {hasData && (
        <>
          <div style={FILL_HEIGHT}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={X_AXIS_TICK_STYLE}
                  tickCount={4}
                  label={X_AXIS_LABEL}
                />
                <YAxis
                  stroke="#666"
                  tick={Y_AXIS_TICK_STYLE}
                  tickCount={5}
                  width={50}
                />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  formatter={capBaseTooltipFormatter}
                />
                <Line
                  type="monotone"
                  dataKey="cap_fill_actual"
                  name={SIGNAL_METADATA["cap_fill_actual"].label}
                  stroke={SIGNAL_METADATA["cap_fill_actual"].color}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap pt-2 mt-2 border-t gap-3 border-gray-border">
            <div className="flex items-baseline gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: SIGNAL_METADATA["cap_fill_actual"].color,
                }}
              />
              <span className="text-xs text-gray-text-dim">
                Cap Fill Capacitance:
              </span>
              <span className="text-sm font-normal text-gray-text tabular-nums">
                {latestValue !== null ? fix(latestValue, 3) : "--"}
              </span>
              <span className="text-xs text-gray-text-dim">pF</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

const PLOTS = [
  () => <PressurePlot config={COPV_CONFIG} />,
  () => <PressurePlot config={OXTANK_CONFIG} />,
  () => <MultiSignalPlot config={MULTI_SIGNAL_CONFIGS[0]} />,
  () => <MultiSignalPlot config={MULTI_SIGNAL_CONFIGS[1]} />,
  () => <FillLevelPlot />,
  () => <CapBasePlot />,
];

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const FixedPlotsPanel = memo(function FixedPlotsPanel() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const expandCtx = useMemo(
    () => PLOTS.map((_, i) => ({ onExpand: () => setExpanded(i) })),
    [],
  );
  const closeCtx = useMemo(() => ({ onClose: () => setExpanded(null) }), []);

  // Esc closes the popup
  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div className="flex flex-col h-full ui-section">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-4">
        <h2 className="ui-section-title">Live telemetry</h2>
        <PulseFill />
      </div>

      <div className="px-4 pb-4 overflow-hidden" style={FILL_HEIGHT}>
        {/* three charts per row */}
        <div className="h-full grid grid-cols-3 grid-rows-2 gap-2">
          {PLOTS.map((Plot, i) => (
            <PlotFrameCtx.Provider key={i} value={expandCtx[i]}>
              <Plot />
            </PlotFrameCtx.Provider>
          ))}
        </div>
      </div>

      {expanded !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/50"
          onMouseDown={closeCtx.onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={stopPropagation}
            className="w-full p-2 rounded-lg max-w-[1400px] h-[80vh] ui-section"
          >
            <PlotFrameCtx.Provider value={closeCtx}>
              {PLOTS[expanded]()}
            </PlotFrameCtx.Provider>
          </div>
        </div>
      )}
    </div>
  );
});
