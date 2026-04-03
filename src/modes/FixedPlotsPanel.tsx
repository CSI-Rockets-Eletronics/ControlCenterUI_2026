import { memo, useCallback, useMemo, useState } from "react";
import {
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SIGNAL_METADATA, useTelemetryStore } from "@/stores/telemetryStore";

import { PulseFill } from "./PulseFill";

const PLOT_CONFIGS = [
  {
    title: "COPV Pressure",
    signals: ["copv_1_psi", "copv_2_psi"] as const,
    unit: "PSI",
    height: 240,
  },
  {
    title: "Oxtank Pressure",
    signals: ["oxtank_1_psi", "oxtank_2_psi"] as const,
    unit: "PSI",
    height: 240,
  },
  {
    title: "Temperature",
    signals: [
      "gn2_internal_temp_c",
      "gn2_external_temp_c",
      "lox_upper_temp_c",
      "lox_lower_temp_c",
    ] as const,
    unit: "°C",
    height: 250,
  },
  {
    title: "Load Cells",
    signals: ["load_cell_1_lbs", "load_cell_2_lbs"] as const,
    unit: "lbs",
    height: 200,
  },
  {
    title: "Cap Fill",
    signals: ["cap_fill_actual", "cap_fill_base"] as const,
    unit: "pF",
    height: 220,
  },
] as const;

const MAX_HISTORY_SECONDS = 600;
const DEFAULT_TIME_RANGE_SECONDS = 120;

const X_AXIS_TICK_STYLE = { fontSize: 10 } as const;
const Y_AXIS_TICK_STYLE = { fontSize: 10 } as const;

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "11px",
} as const;

const LEGEND_WRAPPER_STYLE = { fontSize: "10px" } as const;

// Hoisted module-level constants — never recreated
const CAP_FILL_REFERENCE_LINE_LABEL = {
  value: "base",
  fontSize: 9,
  fill: "#888",
  position: "insideTopRight" as const,
};

const capFillTooltipFormatter = (value: number) =>
  [`${value.toFixed(3)} pF`] as const;

// ── Scrollable time bar ────────────────────────────────────────────────────────

interface TimeScrollBarProps {
  timeRangeSeconds: number;
  timeOffsetSeconds: number;
  onOffsetChange: (offset: number) => void;
  onRangeChange: (range: number) => void;
}

const TimeScrollBar = memo(function TimeScrollBar({
  timeRangeSeconds,
  timeOffsetSeconds,
  onOffsetChange,
  onRangeChange,
}: TimeScrollBarProps) {
  const maxOffset = MAX_HISTORY_SECONDS - timeRangeSeconds;
  const isLive = timeOffsetSeconds === 0;

  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      onRangeChange(next);
      const newMax = MAX_HISTORY_SECONDS - next;
      if (timeOffsetSeconds > newMax) onOffsetChange(newMax);
    },
    [onRangeChange, onOffsetChange, timeOffsetSeconds],
  );

  const handleGoLive = useCallback(() => {
    onOffsetChange(0);
  }, [onOffsetChange]);

  const handleScrollChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const invertedVal = Math.max(0, maxOffset) - Number(e.target.value);
      onOffsetChange(invertedVal);
    },
    [onOffsetChange, maxOffset],
  );

  return (
    <div className="flex flex-col px-3 pt-2 pb-3 border-t border-gray-border gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-text-dim whitespace-nowrap">
            Window
          </span>
          <input
            type="range"
            min={10}
            max={MAX_HISTORY_SECONDS}
            step={10}
            value={timeRangeSeconds}
            onChange={handleRangeChange}
            className="cursor-pointer w-28 accent-blue-500"
          />
          <span className="w-10 font-mono text-xs text-gray-text">
            {timeRangeSeconds}s
          </span>
        </div>

        <button
          onClick={handleGoLive}
          className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
            isLive
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-gray-bg-1 text-gray-text-dim border border-gray-border hover:border-green-500/50 hover:text-green-400"
          }`}
        >
          {isLive ? "● LIVE" : "Go Live"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-text-dim whitespace-nowrap">
          Scroll
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, maxOffset)}
          step={1}
          value={Math.max(0, maxOffset) - timeOffsetSeconds}
          onChange={handleScrollChange}
          className="flex-1 cursor-pointer accent-blue-500"
        />
        <span className="w-20 font-mono text-xs text-right text-gray-text">
          {timeOffsetSeconds === 0 ? "now" : `-${timeOffsetSeconds}s`}
        </span>
      </div>
    </div>
  );
});

// ── Main panel ─────────────────────────────────────────────────────────────────

export const FixedPlotsPanel = memo(function FixedPlotsPanel() {
  const [timeRangeSeconds, setTimeRangeSeconds] = useState(
    DEFAULT_TIME_RANGE_SECONDS,
  );
  const [timeOffsetSeconds, setTimeOffsetSeconds] = useState(0);

  const handleOffsetChange = useCallback((offset: number) => {
    setTimeOffsetSeconds(Math.max(0, offset));
  }, []);

  const handleRangeChange = useCallback((range: number) => {
    setTimeRangeSeconds(range);
  }, []);

  return (
    <div className="flex flex-col h-full border bg-gray-el-bg rounded-xl border-gray-border">
      <div className="flex items-center justify-between p-3 border-b border-gray-border">
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-text">
          Live Telemetry
        </h2>
        {timeOffsetSeconds > 0 && (
          <span className="text-xs font-semibold text-amber-400">
            ⏪ Viewing -{timeOffsetSeconds}s
          </span>
        )}
      </div>

      <TimeScrollBar
        timeRangeSeconds={timeRangeSeconds}
        timeOffsetSeconds={timeOffsetSeconds}
        onOffsetChange={handleOffsetChange}
        onRangeChange={handleRangeChange}
      />

      <div className="p-3 overflow-y-scroll" style={{ flex: "1 1 0px" }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-3">
            <MultiSignalPlot
              config={PLOT_CONFIGS[0]}
              timeRangeSeconds={timeRangeSeconds}
              timeOffsetSeconds={timeOffsetSeconds}
            />
            <PulseFill />
            <MultiSignalPlot
              config={PLOT_CONFIGS[3]}
              timeRangeSeconds={timeRangeSeconds}
              timeOffsetSeconds={timeOffsetSeconds}
            />
          </div>
          <div className="flex flex-col gap-3">
            <MultiSignalPlot
              config={PLOT_CONFIGS[1]}
              timeRangeSeconds={timeRangeSeconds}
              timeOffsetSeconds={timeOffsetSeconds}
            />
            <MultiSignalPlot
              config={PLOT_CONFIGS[2]}
              timeRangeSeconds={timeRangeSeconds}
              timeOffsetSeconds={timeOffsetSeconds}
            />
          </div>
        </div>

        <div className="mt-3">
          <CapFillPlot
            config={PLOT_CONFIGS[4]}
            timeRangeSeconds={timeRangeSeconds}
            timeOffsetSeconds={timeOffsetSeconds}
          />
        </div>
      </div>
    </div>
  );
});

// ── Generic multi-signal plot ──────────────────────────────────────────────────

interface MultiSignalPlotProps {
  config: (typeof PLOT_CONFIGS)[number];
  timeRangeSeconds: number;
  timeOffsetSeconds: number;
}

const MultiSignalPlot = memo(function MultiSignalPlot({
  config,
  timeRangeSeconds,
  timeOffsetSeconds,
}: MultiSignalPlotProps) {
  const store = useTelemetryStore();

  const chartData = useMemo(() => {
    const now = Date.now() * 1000;
    const endTime = now - timeOffsetSeconds * 1e6;
    const startTime = endTime - timeRangeSeconds * 1e6;

    const allSamples = config.signals.map((signal) =>
      store.getSamples(signal, startTime, endTime),
    );

    const timestamps = new Set<number>();
    allSamples.forEach((samples) => {
      samples.forEach((s) => timestamps.add(s.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, number> = {
        time: (timestamp - endTime) / 1e6,
      };
      config.signals.forEach((signal, idx) => {
        const sample = allSamples[idx].find((s) => s.timestamp === timestamp);
        if (sample) {
          dataPoint[signal] = sample.value;
        }
      });
      return dataPoint;
    });
  }, [config.signals, store, timeRangeSeconds, timeOffsetSeconds]);

  const xAxisLabel = useMemo(
    () => ({
      value:
        timeOffsetSeconds > 0
          ? `Time (s, offset -${timeOffsetSeconds}s)`
          : "Time (s)",
      position: "insideBottom" as const,
      offset: -5,
      fontSize: 10,
    }),
    [timeOffsetSeconds],
  );

  const xAxisDomain = useMemo(
    () => [-timeRangeSeconds, 0] as [number, number],
    [timeRangeSeconds],
  );

  const hasData = chartData.length > 0;

  return (
    <div
      className="p-3 border rounded-lg bg-gray-bg-1 border-gray-border"
      style={{ height: `${config.height + 80}px` }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-text">{config.title}</h3>
        <span className="text-xs text-gray-text-dim">{config.unit}</span>
      </div>

      {!hasData && (
        <div
          style={{ height: `${config.height}px` }}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for data...
        </div>
      )}

      {hasData && (
        <>
          <div style={{ height: `${config.height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={X_AXIS_TICK_STYLE}
                  tickCount={3}
                  label={xAxisLabel}
                  domain={xAxisDomain}
                  type="number"
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
                  verticalAlign="top"
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

          <div className="flex flex-wrap pt-2 mt-2 border-t gap-3 border-gray-border">
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
                  <span className="text-xs text-gray-text-dim">
                    {SIGNAL_METADATA[signal].label}:
                  </span>
                  <span className="font-mono text-xs font-semibold text-gray-text tabular-nums">
                    {latestValue !== null && latestValue !== undefined
                      ? latestValue.toFixed(1)
                      : "--"}
                  </span>
                  <span className="text-xs text-gray-text-dim">
                    {config.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

// ── Cap Fill plot ──────────────────────────────────────────────────────────────

interface CapFillPlotProps {
  config: (typeof PLOT_CONFIGS)[4];
  timeRangeSeconds: number;
  timeOffsetSeconds: number;
}

const CapFillPlot = memo(function CapFillPlot({
  config,
  timeRangeSeconds,
  timeOffsetSeconds,
}: CapFillPlotProps) {
  const store = useTelemetryStore();

  const { chartData, latestActual, latestBase, delta } = useMemo(() => {
    const now = Date.now() * 1000;
    const endTime = now - timeOffsetSeconds * 1e6;
    const startTime = endTime - timeRangeSeconds * 1e6;

    const allSamples = config.signals.map((signal) =>
      store.getSamples(signal, startTime, endTime),
    );

    const timestamps = new Set<number>();
    allSamples.forEach((samples) => {
      samples.forEach((s) => timestamps.add(s.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const data = sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, number> = {
        time: (timestamp - endTime) / 1e6,
      };
      config.signals.forEach((signal, idx) => {
        const sample = allSamples[idx].find((s) => s.timestamp === timestamp);
        if (sample) dataPoint[signal] = sample.value;
      });
      return dataPoint;
    });

    const last = data[data.length - 1];
    const la = last?.cap_fill_actual ?? null;
    const lb = last?.cap_fill_base ?? null;
    const d = la != null && lb != null ? la - lb : null;

    return { chartData: data, latestActual: la, latestBase: lb, delta: d };
  }, [config.signals, store, timeRangeSeconds, timeOffsetSeconds]);

  const xAxisLabel = useMemo(
    () => ({
      value:
        timeOffsetSeconds > 0
          ? `Time (s, offset -${timeOffsetSeconds}s)`
          : "Time (s)",
      position: "insideBottom" as const,
      offset: -5,
      fontSize: 10,
    }),
    [timeOffsetSeconds],
  );

  const xAxisDomain = useMemo(
    () => [-timeRangeSeconds, 0] as [number, number],
    [timeRangeSeconds],
  );

  const hasData = chartData.length > 0;

  return (
    <div className="p-3 border rounded-lg bg-gray-bg-1 border-gray-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-gray-text">Cap Fill</h3>
          {delta !== null && (
            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                delta > 0
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : delta < 0
                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                    : "bg-gray-bg-1 text-gray-text-dim border border-gray-border"
              }`}
            >
              Δ {delta >= 0 ? "+" : ""}
              {delta.toFixed(2)} pF
            </span>
          )}
        </div>
        <span className="text-xs text-gray-text-dim">pF</span>
      </div>

      {!hasData && (
        <div
          style={{ height: `${config.height}px` }}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for cap fill data...
        </div>
      )}

      {hasData && (
        <>
          <div style={{ height: `${config.height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={X_AXIS_TICK_STYLE}
                  tickCount={6}
                  label={xAxisLabel}
                  domain={xAxisDomain}
                  type="number"
                />
                <YAxis
                  stroke="#666"
                  tick={Y_AXIS_TICK_STYLE}
                  tickCount={6}
                  width={55}
                />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  formatter={capFillTooltipFormatter}
                />
                <Legend
                  wrapperStyle={LEGEND_WRAPPER_STYLE}
                  align="left"
                  verticalAlign="top"
                  layout="horizontal"
                  iconType="line"
                />
                {latestBase !== null && (
                  <ReferenceLine
                    y={latestBase}
                    stroke="#888"
                    strokeDasharray="4 2"
                    label={CAP_FILL_REFERENCE_LINE_LABEL}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="cap_fill_actual"
                  name={SIGNAL_METADATA["cap_fill_actual"].label}
                  stroke={SIGNAL_METADATA["cap_fill_actual"].color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cap_fill_base"
                  name={SIGNAL_METADATA["cap_fill_base"].label}
                  stroke={SIGNAL_METADATA["cap_fill_base"].color}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap pt-2 mt-2 border-t gap-4 border-gray-border">
            <div className="flex items-baseline gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: SIGNAL_METADATA["cap_fill_actual"].color,
                }}
              />
              <span className="text-xs text-gray-text-dim">Actual:</span>
              <span className="font-mono text-xs font-semibold text-gray-text tabular-nums">
                {latestActual !== null ? latestActual.toFixed(3) : "--"}
              </span>
              <span className="text-xs text-gray-text-dim">pF</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: SIGNAL_METADATA["cap_fill_base"].color,
                }}
              />
              <span className="text-xs text-gray-text-dim">Base:</span>
              <span className="font-mono text-xs font-semibold text-gray-text tabular-nums">
                {latestBase !== null ? latestBase.toFixed(3) : "--"}
              </span>
              <span className="text-xs text-gray-text-dim">pF</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
