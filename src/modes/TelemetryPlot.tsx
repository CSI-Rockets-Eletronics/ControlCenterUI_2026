import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  type PlotConfig,
  SIGNAL_METADATA,
  useTelemetryStore,
} from "@/stores/telemetryStore";

interface Props {
  plotConfig: PlotConfig;
  /** Chart height in px. Default 180. */
  height?: number;
  /** Override store-backed controls (for plots not in the plots list). */
  onTimeRangeChange?: (timeRange: number) => void;
  onTogglePause?: () => void;
}

const TIME_RANGES = [
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" },
  { value: 1200, label: "20m" },
] as const;

const TimeRangeOption = memo(function TimeRangeOption({
  value,
  label,
  selected,
  active,
  index,
  onPick,
  onHover,
}: {
  value: number;
  label: string;
  selected: boolean;
  active: boolean;
  index: number;
  onPick: (value: number) => void;
  onHover: (index: number) => void;
}) {
  const handleClick = useCallback(() => onPick(value), [onPick, value]);
  const handleEnter = useCallback(() => onHover(index), [onHover, index]);
  return (
    <li
      role="option"
      aria-selected={selected}
      onMouseDown={preventFocusLoss}
      onClick={handleClick}
      onMouseEnter={handleEnter}
      className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-md cursor-pointer ${
        active ? "ui-selected" : "text-gray-text"
      }`}
    >
      {label}
      {selected && <span aria-hidden>✓</span>}
    </li>
  );
});

const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

/** Custom time-range picker: button + list; ↑/↓, Enter, Esc work. */
const TimeRangeDropdown = memo(function TimeRangeDropdown({
  value,
  onSelect,
}: {
  value: number;
  onSelect: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentIndex = TIME_RANGES.findIndex((r) => r.value === value);
  const [active, setActive] = useState(currentIndex);
  const rootRef = useRef<HTMLDivElement>(null);

  // close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = useCallback(
    (v: number) => {
      onSelect(v);
      setOpen(false);
    },
    [onSelect],
  );

  const toggle = useCallback(() => {
    setActive(currentIndex);
    setOpen((o) => !o);
  }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          setActive(currentIndex);
          setOpen(true);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, TIME_RANGES.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick(TIME_RANGES[active].value);
      } else if (e.key === "Escape" || e.key === "Tab") {
        setOpen(false);
      }
    },
    [open, active, currentIndex, pick],
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Time range"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex items-center py-2 pl-4 pr-3 text-sm font-semibold rounded-lg gap-2 bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
      >
        {TIME_RANGES[currentIndex]?.label ?? `${value}s`}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
          className={open ? "rotate-180" : ""}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Time range"
          className="absolute right-0 z-30 p-1 mt-1 rounded-lg min-w-[6rem] bg-gray-el-bg"
        >
          {TIME_RANGES.map((r, i) => (
            <TimeRangeOption
              key={r.value}
              value={r.value}
              label={r.label}
              index={i}
              selected={r.value === value}
              active={i === active}
              onPick={pick}
              onHover={setActive}
            />
          ))}
        </ul>
      )}
    </div>
  );
});

export const TelemetryPlot = memo(function TelemetryPlot({
  plotConfig,
  height = 180,
  onTimeRangeChange,
  onTogglePause,
}: Props) {
  const { signal, timeRange, paused, id } = plotConfig;

  const updateTimeRange = useTelemetryStore(
    (state) => state.updatePlotTimeRange,
  );
  const togglePause = useTelemetryStore((state) => state.togglePlotPause);
  const getSamples = useTelemetryStore((state) => state.getSamples);

  const metadata = SIGNAL_METADATA[signal];

  // Track the timestamp when pause was activated
  const pausedTimestampRef = useRef<number | null>(null);

  // Force re-renders when live to show fresh data
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (paused) return;

    // Update every 100ms when live
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (paused && pausedTimestampRef.current === null) {
      // Capture timestamp when pausing
      pausedTimestampRef.current = Date.now() * 1000;
    } else if (!paused) {
      // Clear when unpausing
      pausedTimestampRef.current = null;
    }
  }, [paused]);

  // Use frozen timestamp when paused, current time when live
  const now =
    paused && pausedTimestampRef.current !== null
      ? pausedTimestampRef.current
      : Date.now() * 1000;

  const tstart = now - timeRange * 1e6;
  const tend = now;

  const samples = getSamples(signal, tstart, tend);

  const plotData = samples.map((sample) => ({
    time: (sample.timestamp - now) / 1e6,
    value: sample.value,
  }));

  const handleTimeRangeChange = useCallback(
    (value: number) => {
      if (onTimeRangeChange) onTimeRangeChange(value);
      else updateTimeRange(id, value);
    },
    [id, updateTimeRange, onTimeRangeChange],
  );

  const handleTogglePause = useCallback(() => {
    if (onTogglePause) onTogglePause();
    else togglePause(id);
  }, [id, togglePause, onTogglePause]);

  const chartMargin = useMemo(
    () => ({ top: 5, right: 10, left: 0, bottom: 5 }),
    [],
  );
  const xAxisTick = useMemo(() => ({ fill: "#64748b", fontSize: 11 }), []);
  const yAxisTick = useMemo(() => ({ fill: "#64748b", fontSize: 11 }), []);
  const tooltipContentStyle = useMemo(
    () => ({
      backgroundColor: "rgb(var(--gray-bg-1))",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
    }),
    [],
  );
  const tooltipLabelStyle = useMemo(
    () => ({ color: "rgb(var(--gray-text-dim))" }),
    [],
  );

  const tickFormatter = useCallback((val: number) => `${val.toFixed(0)}s`, []);
  const tooltipFormatter = useCallback(
    (value: number) => [value.toFixed(2), metadata.unit],
    [metadata.unit],
  );
  const labelFormatter = useCallback(
    (label: number) => `${label.toFixed(1)}s ago`,
    [],
  );

  return (
    <div className="p-4 ui-card">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <div
            className="flex-shrink-0 w-3 h-3 rounded-full"
            style={{ backgroundColor: metadata.color }}
          />
          <h3 className="font-medium truncate tracking-[-0.01em] text-gray-text">
            {metadata.label} ({metadata.unit})
          </h3>
        </div>

        <div className="flex items-center flex-shrink-0 gap-2">
          <TimeRangeDropdown
            value={timeRange}
            onSelect={handleTimeRangeChange}
          />

          <button
            onClick={handleTogglePause}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              paused
                ? "bg-yellow-solid hover:bg-yellow-solid-hover text-white"
                : "bg-green-solid hover:bg-green-solid-hover text-white"
            }`}
          >
            {paused ? "RESUME" : "PAUSE"}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={plotData} margin={chartMargin}>
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            tick={xAxisTick}
            tickFormatter={tickFormatter}
          />
          <YAxis stroke="#94a3b8" tick={yAxisTick} width={60} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            formatter={tooltipFormatter}
            labelFormatter={labelFormatter}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={metadata.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center mt-2 text-xs gap-4 text-gray-text-dim">
        <div>Points: {plotData.length}</div>
        {plotData.length > 0 && (
          <>
            <div>
              Latest: {plotData[plotData.length - 1]?.value.toFixed(2) || "--"}{" "}
              {metadata.unit}
            </div>
            <div>
              Min: {Math.min(...plotData.map((d) => d.value)).toFixed(2)}{" "}
              {metadata.unit}
            </div>
            <div>
              Max: {Math.max(...plotData.map((d) => d.value)).toFixed(2)}{" "}
              {metadata.unit}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
