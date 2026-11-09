import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type PlotConfig,
  SIGNAL_METADATA,
  type SignalType,
  useTelemetryStore,
  useThrottledTelemetryVersion,
} from "@/stores/telemetryStore";
import { type DataView, useViewPrefsStore } from "@/stores/viewPrefsStore";

import { FOCUS_PLOT_SEARCH_EVENT, PlotsPanel } from "./PlotsPanel";
import { TelemetryPlot } from "./TelemetryPlot";

const SIGNALS = Object.keys(SIGNAL_METADATA) as SignalType[];

const VIEWS: { key: DataView; label: string }[] = [
  { key: "cards", label: "Cards" },
  { key: "graphs", label: "Graphs" },
  { key: "focus", label: "Focus" },
];

/** Latest value plus min/avg/max over everything buffered for a signal. */
function useSignalStats(signal: SignalType) {
  // re-render ~5x/s on new data; stats are kept incrementally by the buffer
  useThrottledTelemetryVersion();
  const buffer = useTelemetryStore.getState().buffers.get(signal);
  const n = buffer?.count ?? 0;
  return {
    latest: buffer?.getLatest()?.value ?? null,
    min: n ? buffer!.min : null,
    max: n ? buffer!.max : null,
    avg: n ? buffer!.avg : null,
  };
}

const fmt = (v: number | null, digits = 1) =>
  v === null ? "--" : v.toFixed(digits);

const SignalCard = memo(function SignalCard({
  signal,
}: {
  signal: SignalType;
}) {
  const meta = SIGNAL_METADATA[signal];
  const { latest, min, avg, max } = useSignalStats(signal);

  // Name, live value, then min/avg/max on one line. Font sizes scale with the
  // window height (vh) so all cards still fit on one screen.
  return (
    <div className="flex flex-col justify-between px-3 py-2 bg-gray-bg-2 rounded-card">
      <div className="flex items-center min-w-0 gap-2">
        <div
          className="rounded-full w-2.5 h-2.5 shrink-0"
          style={{ backgroundColor: meta.color }}
        />
        <h3 className="font-medium truncate text-[clamp(15px,2.1vh,19px)] tracking-[-0.01em] text-gray-text">
          {meta.label}
        </h3>
      </div>

      <div className="font-bold leading-tight text-[clamp(22px,3.6vh,36px)] tracking-[-0.02em] tabular-nums text-gray-text">
        {fmt(latest, 2)}
        <span className="ml-1 text-sm font-normal tracking-normal text-gray-text-dim">
          {meta.unit}
        </span>
      </div>

      <div className="flex text-xs leading-4 whitespace-nowrap tabular-nums gap-2.5 text-gray-text-dim">
        <span>
          min <span className="text-gray-text">{fmt(min)}</span>
        </span>
        {/* hidden on narrow cards (<1280px) so min and max never get cut off */}
        <span className="hidden xl:inline">
          avg <span className="text-gray-text">{fmt(avg)}</span>
        </span>
        <span>
          max <span className="text-gray-text">{fmt(max)}</span>
        </span>
      </div>
    </div>
  );
});

const CardsView = memo(function CardsView() {
  // Rows share the available height (1fr) so the grid fits without scrolling.
  // A row never gets shorter than its card's content; when the window is too
  // short for that, the grid grows past it and this view scrolls.
  return (
    <div className="h-full p-4">
      <div className="flex flex-col h-full p-4 ui-section">
        <h2 className="mb-3 ui-section-title">Signals</h2>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="min-h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 auto-rows-[minmax(min-content,1fr)] gap-2">
            {SIGNALS.map((signal) => (
              <SignalCard key={signal} signal={signal} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

const GraphsView = memo(function GraphsView() {
  return (
    <div className="h-full p-4">
      <PlotsPanel />
    </div>
  );
});

/** Compact card for the Focus sidebar. */
const SidebarCard = memo(function SidebarCard({
  signal,
  selected,
  onSelect,
}: {
  signal: SignalType;
  selected: boolean;
  onSelect: (signal: SignalType) => void;
}) {
  const meta = SIGNAL_METADATA[signal];
  const { latest } = useSignalStats(signal);
  const handleClick = useCallback(() => onSelect(signal), [onSelect, signal]);

  return (
    <button
      onClick={handleClick}
      aria-pressed={selected}
      className={`w-full px-3 py-2.5 text-left ui-card transition-colors ${
        selected ? "ui-selected" : "hover:bg-gray-el-bg-hover"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="rounded-full w-2.5 h-2.5 shrink-0"
          style={{ backgroundColor: meta.color }}
        />
        <span className="text-base font-medium truncate tracking-[-0.01em] text-gray-text">
          {meta.label}
        </span>
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-gray-text">
        {fmt(latest, 2)}
        <span className="ml-1 text-xs font-normal text-gray-text-dim">
          {meta.unit}
        </span>
      </div>
    </button>
  );
});

/** Chart height that fills the window below the nav and stat tiles. */
function useFocusChartHeight() {
  const calc = () => Math.max(260, window.innerHeight - 360);
  const [height, setHeight] = useState(calc);
  useEffect(() => {
    const onResize = () => setHeight(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return height;
}

const FocusMain = memo(function FocusMain({ signal }: { signal: SignalType }) {
  const meta = SIGNAL_METADATA[signal];
  const { latest, min, avg, max } = useSignalStats(signal);
  const height = useFocusChartHeight();

  // Local plot settings so the focused graph doesn't add to the Graphs list.
  const [timeRange, setTimeRange] = useState(120);
  const [paused, setPaused] = useState(false);
  const togglePaused = useCallback(() => setPaused((p) => !p), []);

  const plotConfig = useMemo<PlotConfig>(
    () => ({ id: `focus-${signal}`, signal, timeRange, paused }),
    [signal, timeRange, paused],
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="grid grid-cols-4 gap-2">
        {[
          ["Current", latest, 2],
          ["Min", min, 1],
          ["Avg", avg, 1],
          ["Max", max, 1],
        ].map(([label, value, digits]) => (
          <div key={label as string} className="px-4 py-3 ui-card">
            <div className="text-xs text-gray-text-dim">{label}</div>
            <div className="text-xl font-bold tabular-nums text-gray-text">
              {fmt(value as number | null, digits as number)}
              <span className="ml-1 text-xs font-normal text-gray-text-dim">
                {meta.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
      <TelemetryPlot
        plotConfig={plotConfig}
        height={height}
        onTimeRangeChange={setTimeRange}
        onTogglePause={togglePaused}
      />
    </div>
  );
});

/** ⌘ on macOS, "Ctrl+" elsewhere (for the search shortcut hint). */
const SEARCH_MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl+";

// Set by the ⌘K handler when it has to switch to Focus first; FocusView
// reads it on mount and focuses the search box.
let focusSearchOnMount = false;
const FOCUS_SEARCH_EVENT = "focus-signal-search";

const FocusView = memo(function FocusView() {
  const focusSignal = useViewPrefsStore((s) => s.focusSignal);
  const setFocusSignal = useViewPrefsStore((s) => s.setFocusSignal);
  const signal =
    focusSignal && focusSignal in SIGNAL_METADATA ? focusSignal : SIGNALS[0];

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIGNALS;
    return SIGNALS.filter((sig) =>
      SIGNAL_METADATA[sig].label.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    // ⌘K toggles: focus the search, or leave it if already focused
    const focus = () => {
      const el = inputRef.current;
      if (!el) return;
      if (document.activeElement === el) {
        el.blur();
      } else {
        el.focus();
        el.select();
      }
    };
    if (focusSearchOnMount) {
      focusSearchOnMount = false;
      focus();
    }
    window.addEventListener(FOCUS_SEARCH_EVENT, focus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focus);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && matches.length > 0) {
        setFocusSignal(matches[0]);
      } else if (e.key === "Escape") {
        setQuery("");
        e.currentTarget.blur();
      }
    },
    [matches, setFocusSignal],
  );

  return (
    <div className="h-full p-4 grid grid-cols-[260px,1fr] gap-2">
      <div className="flex flex-col min-h-0 p-3 ui-section">
        <h2 className="px-1 mb-3 ui-section-title">Signals</h2>
        <div className="relative mb-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search signals"
            aria-label="Search signals"
            className="w-full py-2 pl-3 pr-12 text-sm rounded-lg outline-none bg-gray-bg-2 text-gray-text placeholder:text-gray-text-dim focus:outline-2 focus:outline-gray-solid"
          />
          <kbd className="absolute font-sans text-xs leading-none pointer-events-none -translate-y-1/2 right-3 top-1/2 text-gray-text-dim">
            {SEARCH_MOD}K
          </kbd>
        </div>
        <div className="flex-1 min-h-0 pr-1 overflow-y-auto space-y-2 scrollbar-thin">
          {matches.map((s) => (
            <SidebarCard
              key={s}
              signal={s}
              selected={s === signal}
              onSelect={setFocusSignal}
            />
          ))}
          {matches.length === 0 && (
            <p className="px-1 py-2 text-sm text-gray-text-dim">
              No signals match “{query}”
            </p>
          )}
        </div>
      </div>
      <div className="min-h-0 p-4 ui-section">
        <FocusMain key={signal} signal={signal} />
      </div>
    </div>
  );
});

const ViewTab = memo(function ViewTab({
  view,
  label,
  selected,
  onSelect,
}: {
  view: DataView;
  label: string;
  selected: boolean;
  onSelect: (view: DataView) => void;
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

export const DataDisplayMode = memo(function DataDisplayMode() {
  const view = useViewPrefsStore((s) => s.dataView);
  const setView = useViewPrefsStore((s) => s.setDataView);

  // ⌘K / Ctrl+K: focus the search for the current view (Graphs: plot
  // search, Focus: signal search; Cards jumps to Focus)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      const current = useViewPrefsStore.getState().dataView;
      if (current === "graphs") {
        window.dispatchEvent(new Event(FOCUS_PLOT_SEARCH_EVENT));
      } else if (current === "focus") {
        window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
      } else {
        focusSearchOnMount = true;
        setView("focus");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setView]);

  return (
    <div className="flex flex-col h-full bg-gray-bg-1">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="ui-section-title">Data display</h1>
        <div
          role="tablist"
          aria-label="Data display layout"
          className="flex p-1 rounded-lg bg-gray-el-bg gap-1"
        >
          {VIEWS.map((v) => (
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
        {view === "graphs" ? (
          <GraphsView />
        ) : view === "focus" ? (
          <FocusView />
        ) : (
          <CardsView />
        )}
      </div>
    </div>
  );
});
