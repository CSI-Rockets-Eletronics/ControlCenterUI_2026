import { memo, useMemo } from "react";
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

const TIME_RANGE_SECONDS = 120;

const X_AXIS_TICK_STYLE = { fontSize: 10 } as const;
const X_AXIS_LABEL = {
  value: "Time (s)",
  position: "insideBottom",
  offset: -5,
  fontSize: 10,
} as const;
const Y_AXIS_TICK_STYLE = { fontSize: 10 } as const;

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "11px",
} as const;

const LEGEND_WRAPPER_STYLE = { fontSize: "10px" } as const;

const CAP_FILL_REFERENCE_LINE_LABEL = {
  value: "base",
  fontSize: 9,
  fill: "#888",
  position: "insideTopRight" as const,
};

const capFillTooltipFormatter = (value: number) =>
  [`${value.toFixed(3)} pF`] as const;

export const FixedPlotsPanel = memo(function FixedPlotsPanel() {
  return (
    <div className="flex flex-col h-full border bg-gray-el-bg rounded-xl border-gray-border">
      <div className="p-3 border-b border-gray-border">
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-text">
          Live Telemetry
        </h2>
      </div>

      <div className="p-3 overflow-y-scroll" style={{ flex: "1 1 0px" }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-3">
            <MultiSignalPlot config={PLOT_CONFIGS[0]} />
            <PulseFill />
            <MultiSignalPlot config={PLOT_CONFIGS[3]} />
          </div>
          <div className="flex flex-col gap-3">
            <MultiSignalPlot config={PLOT_CONFIGS[1]} />
            <MultiSignalPlot config={PLOT_CONFIGS[2]} />
          </div>
        </div>

        <div className="mt-3">
          <CapFillPlot config={PLOT_CONFIGS[4]} />
        </div>

        <div className="mt-3">
          <BoardTempPlot />
        </div>
      </div>
    </div>
  );
});

interface MultiSignalPlotProps {
  config: (typeof PLOT_CONFIGS)[number];
}

const MultiSignalPlot = memo(function MultiSignalPlot({
  config,
}: MultiSignalPlotProps) {
  const store = useTelemetryStore();

  const chartData = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const allSamples = config.signals.map((signal) =>
      store.getSamples(signal, startTime, now),
    );

    const timestamps = new Set<number>();
    allSamples.forEach((samples) => {
      samples.forEach((s) => timestamps.add(s.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, number> = {
        time: (timestamp - now) / 1e6,
      };

      config.signals.forEach((signal, idx) => {
        const sample = allSamples[idx].find((s) => s.timestamp === timestamp);
        if (sample) {
          dataPoint[signal] = sample.value;
        }
      });

      return dataPoint;
    });
  }, [config.signals, store]);

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

interface CapFillPlotProps {
  config: (typeof PLOT_CONFIGS)[4];
}

const CapFillPlot = memo(function CapFillPlot({ config }: CapFillPlotProps) {
  const store = useTelemetryStore();

  const { chartData, latestActual, latestBase, delta } = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const allSamples = config.signals.map((signal) =>
      store.getSamples(signal, startTime, now),
    );

    const timestamps = new Set<number>();
    allSamples.forEach((samples) => {
      samples.forEach((s) => timestamps.add(s.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const data = sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, number> = {
        time: (timestamp - now) / 1e6,
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
  }, [config.signals, store]);

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
                  label={X_AXIS_LABEL}
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

const BOARD_TEMP_X_AXIS_LABEL = {
  value: "Time (s)",
  position: "insideBottom" as const,
  offset: -5,
  fontSize: 10,
};

const boardTempTooltipFormatter = (value: number) =>
  [`${value.toFixed(1)} °C`] as const;

const BoardTempPlot = memo(function BoardTempPlot() {
  const store = useTelemetryStore();

  const { chartData, latestTemp } = useMemo(() => {
    const now = Date.now() * 1000;
    const startTime = now - TIME_RANGE_SECONDS * 1e6;

    const samples = store.getSamples("cap_fill_board_temp_c", startTime, now);

    const data = samples.map((s) => ({
      time: (s.timestamp - now) / 1e6,
      cap_fill_board_temp_c: s.value,
    }));

    const latest =
      data.length > 0 ? data[data.length - 1].cap_fill_board_temp_c : null;

    return { chartData: data, latestTemp: latest };
  }, [store]);

  const hasData = chartData.length > 0;

  return (
    <div className="p-3 border rounded-lg bg-gray-bg-1 border-gray-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-text">
          Cap Fill Board Temp
        </h3>
        <span className="text-xs text-gray-text-dim">°C</span>
      </div>

      {!hasData && (
        <div
          style={{ height: "120px" }}
          className="flex items-center justify-center text-xs text-gray-text-dim"
        >
          Waiting for data...
        </div>
      )}

      {hasData && (
        <>
          <div style={{ height: "120px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={X_AXIS_TICK_STYLE}
                  tickCount={3}
                  label={BOARD_TEMP_X_AXIS_LABEL}
                />
                <YAxis
                  stroke="#666"
                  tick={Y_AXIS_TICK_STYLE}
                  tickCount={4}
                  width={45}
                />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  formatter={boardTempTooltipFormatter}
                />
                <Line
                  type="monotone"
                  dataKey="cap_fill_board_temp_c"
                  name={SIGNAL_METADATA["cap_fill_board_temp_c"].label}
                  stroke={SIGNAL_METADATA["cap_fill_board_temp_c"].color}
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
                  backgroundColor:
                    SIGNAL_METADATA["cap_fill_board_temp_c"].color,
                }}
              />
              <span className="text-xs text-gray-text-dim">Board Temp:</span>
              <span className="font-mono text-xs font-semibold text-gray-text tabular-nums">
                {latestTemp !== null ? latestTemp.toFixed(1) : "--"}
              </span>
              <span className="text-xs text-gray-text-dim">°C</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
