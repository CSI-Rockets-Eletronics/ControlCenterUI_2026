import { useEffect, useState } from "react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type SignalType =
  | "oxtank_1_psi"
  | "oxtank_2_psi"
  | "copv_1_psi"
  | "copv_2_psi"
  | "pilot_pres_psi"
  | "qd_pres_psi"
  | "injector_1_psi"
  | "injector_2_psi"
  | "upper_cc_psi"
  | "gn2_internal_temp_c"
  | "gn2_external_temp_c"
  | "lox_upper_temp_c"
  | "lox_lower_temp_c"
  | "load_cell_1_lbs"
  | "load_cell_2_lbs"
  | "total_load_lbs"
  | "altitude_ft"
  | "acceleration_g"
  | "total_relay_current_ma"
  | "gn2_drain_current_ma"
  | "gn2_fill_current_ma"
  | "igniter_current_ma"
  | "cap_fill_actual"
  | "cap_fill_base"
  | "cap_fill_board_temp_c";

/**
 * Signal color that changes with the theme. Read at render time; charts
 * redraw every ~200 ms, so a theme switch shows up almost immediately.
 */
export const themed = ({ light, dark }: { light: string; dark: string }) =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark")
    ? dark
    : light;

// #8338ec is too dim on the dark background
export const COPV_PURPLE = { light: "#8338ec", dark: "#a970ff" };
// dark: Ramp-style yellow nudged slightly green; too pale on white, so
// light mode keeps the cyan
export const OXTANK_COLOR = { light: "#00d4ff", dark: "#dcf25a" };

export const SIGNAL_METADATA: Record<
  SignalType,
  { label: string; unit: string; color: string }
> = {
  copv_1_psi: {
    label: "COPV 1",
    unit: "PSI",
    get color() {
      return themed(COPV_PURPLE);
    },
  },
  copv_2_psi: {
    label: "COPV 2",
    unit: "PSI",
    get color() {
      return themed(COPV_PURPLE);
    },
  },

  oxtank_1_psi: {
    label: "Oxtank 1",
    unit: "PSI",
    get color() {
      return themed(OXTANK_COLOR);
    },
  },
  oxtank_2_psi: {
    label: "Oxtank 2",
    unit: "PSI",
    get color() {
      return themed(OXTANK_COLOR);
    },
  },

  pilot_pres_psi: { label: "Pilot Pressure", unit: "PSI", color: "#7209b7" },
  qd_pres_psi: { label: "QD Pressure", unit: "PSI", color: "#560bad" },

  injector_1_psi: { label: "Injector 1", unit: "PSI", color: "#fb5607" },
  injector_2_psi: { label: "Injector 2", unit: "PSI", color: "#ffbe0b" },
  upper_cc_psi: { label: "Upper CC", unit: "PSI", color: "#ff006e" },

  gn2_internal_temp_c: { label: "GN2 Internal", unit: "°C", color: "#06ffa5" },
  gn2_external_temp_c: { label: "GN2 External", unit: "°C", color: "#1ce3ff" },
  lox_upper_temp_c: { label: "LOX Upper", unit: "°C", color: "#00f5ff" },
  lox_lower_temp_c: { label: "LOX Lower", unit: "°C", color: "#4cc9f0" },
  cap_fill_board_temp_c: { label: "Board Temp", unit: "°C", color: "#fb923c" },

  load_cell_1_lbs: { label: "Load Cell 1", unit: "lbs", color: "#ff9e00" },
  load_cell_2_lbs: { label: "Load Cell 2", unit: "lbs", color: "#ff6d00" },
  total_load_lbs: { label: "Total Load", unit: "lbs", color: "#ff3d00" },

  altitude_ft: { label: "Altitude", unit: "ft", color: "#69db7c" },
  acceleration_g: { label: "Acceleration", unit: "g", color: "#ffd43b" },

  total_relay_current_ma: {
    label: "Total Relay Current",
    unit: "mA",
    color: "#ff006e",
  },
  gn2_drain_current_ma: {
    label: "GN2 Drain Current",
    unit: "mA",
    color: "#8338ec",
  },
  gn2_fill_current_ma: {
    label: "GN2 Fill Current",
    unit: "mA",
    color: "#3a86ff",
  },
  igniter_current_ma: {
    label: "Igniter Current",
    unit: "mA",
    color: "#ffbe0b",
  },

  // Firmware (dev_cap_fill.h): cap_fill_base = fill height in %,
  // cap_fill_actual = probe capacitance in pF. The names are misleading.
  cap_fill_base: {
    label: "Cap Fill Height",
    unit: "%",
    color: "#38bdf8",
  },
  cap_fill_actual: {
    label: "Cap Fill Capacitance",
    unit: "pF",
    color: "#94a3b8",
  },
};

export interface Sample {
  timestamp: number; // microseconds
  value: number;
}

class SignalBuffer {
  private buffer: Sample[] = [];
  private maxSize = 100_000;

  // Running stats so cards don't rescan the whole buffer on every render.
  // min/max cover everything seen this session; sum/count track the buffer.
  min = Infinity;
  max = -Infinity;
  private sum = 0;

  append(sample: Sample) {
    this.buffer.push(sample);
    this.sum += sample.value;
    if (sample.value < this.min) this.min = sample.value;
    if (sample.value > this.max) this.max = sample.value;
    if (this.buffer.length > this.maxSize) {
      const dropped = this.buffer.shift();
      if (dropped) this.sum -= dropped.value;
    }
  }

  get count() {
    return this.buffer.length;
  }

  get avg() {
    return this.buffer.length ? this.sum / this.buffer.length : NaN;
  }

  /** First index with timestamp >= t (samples are appended in time order). */
  private lowerBound(t: number) {
    let lo = 0;
    let hi = this.buffer.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.buffer[mid].timestamp < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  query(tstart: number, tend: number): Sample[] {
    // binary search instead of filtering up to 100k samples per call
    return this.buffer.slice(
      this.lowerBound(tstart),
      this.lowerBound(tend + 1),
    );
  }

  getLatest(): Sample | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  getAll(): Sample[] {
    return this.buffer;
  }

  clear() {
    this.buffer = [];
    this.min = Infinity;
    this.max = -Infinity;
    this.sum = 0;
  }
}

export interface PlotConfig {
  id: string;
  signal: SignalType;
  timeRange: number; // s
  paused: boolean;
}

interface TelemetryState {
  buffers: Map<SignalType, SignalBuffer>;
  plots: PlotConfig[];
  /** Date.now() of the last successful poll of the data server, or null. */
  lastServerOkMs: number | null;
  /** Date.now() of the last time a device sent a record we hadn't seen yet. */
  lastFreshDataMs: number | null;
  /**
   * Bumped once per batch of appended samples (not per sample). Subscribe to
   * this to re-render on new data.
   */
  version: number;

  appendSample: (signal: SignalType, sample: Sample) => void;
  addPlot: (signal: SignalType) => void;
  removePlot: (plotId: string) => void;
  updatePlotTimeRange: (plotId: string, timeRange: number) => void;
  togglePlotPause: (plotId: string) => void;
  noteServerOk: () => void;
  noteServerError: () => void;
  noteFreshData: () => void;

  getSamples: (signal: SignalType, tstart: number, tend: number) => Sample[];
  getLatestSample: (signal: SignalType) => Sample | null;
}

const initializeBuffers = () => {
  const signals: SignalType[] = [
    "oxtank_1_psi",
    "oxtank_2_psi",
    "copv_1_psi",
    "copv_2_psi",
    "pilot_pres_psi",
    "qd_pres_psi",
    "injector_1_psi",
    "injector_2_psi",
    "upper_cc_psi",
    "gn2_internal_temp_c",
    "gn2_external_temp_c",
    "lox_upper_temp_c",
    "lox_lower_temp_c",
    "cap_fill_board_temp_c",
    "load_cell_1_lbs",
    "load_cell_2_lbs",
    "total_load_lbs",
    "altitude_ft",
    "acceleration_g",
    "total_relay_current_ma",
    "gn2_drain_current_ma",
    "gn2_fill_current_ma",
    "igniter_current_ma",
    "cap_fill_actual",
    "cap_fill_base",
  ];

  const buffers = new Map<SignalType, SignalBuffer>();
  signals.forEach((signal) => {
    buffers.set(signal, new SignalBuffer());
  });

  return buffers;
};

let commitScheduled = false;

export const useTelemetryStore = create<TelemetryState>()(
  subscribeWithSelector((set, get) => ({
    buffers: initializeBuffers(),
    plots: [],
    lastServerOkMs: null,
    lastFreshDataMs: null,
    version: 0,

    appendSample: (signal, sample) => {
      const buffer = get().buffers.get(signal);
      if (!buffer) {
        console.warn(`Buffer not found for signal: ${signal}`);
        return;
      }
      buffer.append(sample);
      // Coalesce: every append in the same tick triggers a single update,
      // instead of one store update (and app-wide re-render) per sample.
      if (!commitScheduled) {
        commitScheduled = true;
        queueMicrotask(() => {
          commitScheduled = false;
          set((state) => ({
            buffers: new Map(state.buffers),
            version: state.version + 1,
          }));
        });
      }
    },

    addPlot: (signal) => {
      const newPlot: PlotConfig = {
        id: `${signal}-${Date.now()}`,
        signal,
        timeRange: 120,
        paused: false,
      };
      set({ plots: [...get().plots, newPlot] });
    },

    removePlot: (plotId) => {
      set({ plots: get().plots.filter((p) => p.id !== plotId) });
    },

    updatePlotTimeRange: (plotId, timeRange) => {
      set({
        plots: get().plots.map((p) =>
          p.id === plotId ? { ...p, timeRange } : p,
        ),
      });
    },

    togglePlotPause: (plotId) => {
      set({
        plots: get().plots.map((p) =>
          p.id === plotId ? { ...p, paused: !p.paused } : p,
        ),
      });
    },

    noteServerOk: () => set({ lastServerOkMs: Date.now() }),
    noteServerError: () => set({ lastServerOkMs: null }),
    noteFreshData: () => set({ lastFreshDataMs: Date.now() }),

    getSamples: (signal, tstart, tend) => {
      const buffer = get().buffers.get(signal);
      return buffer ? buffer.query(tstart, tend) : [];
    },

    getLatestSample: (signal) => {
      const buffer = get().buffers.get(signal);
      return buffer ? buffer.getLatest() : null;
    },
  })),
);

/** How long without a good poll / new record before we call the link down. */
export const LINK_TIMEOUT_MS = 3000;

export type LinkStatus = "connected" | "noData" | "disconnected";

export function getLinkStatus(
  lastServerOkMs: number | null,
  lastFreshDataMs: number | null,
  now = Date.now(),
): LinkStatus {
  if (lastServerOkMs === null || now - lastServerOkMs > LINK_TIMEOUT_MS) {
    return "disconnected";
  }
  if (lastFreshDataMs === null || now - lastFreshDataMs > LINK_TIMEOUT_MS) {
    return "noData";
  }
  return "connected";
}

/**
 * Re-render on new telemetry, but at most once per `intervalMs`. Charts use
 * this so redraws don't track every data batch.
 */
export function useThrottledTelemetryVersion(intervalMs = 200) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useTelemetryStore.subscribe(
      (s) => s.version,
      () => {
        const now = Date.now();
        const wait = intervalMs - (now - last);
        if (wait <= 0) {
          last = now;
          setTick((t) => t + 1);
        } else if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            last = Date.now();
            setTick((t) => t + 1);
          }, wait);
        }
      },
    );
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs]);
  return tick;
}

/** Keep at most `max` points, evenly spaced, always including the last one. */
export function decimate<T>(points: T[], max = 400): T[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: T[] = [];
  for (let i = 0; i < max - 1; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}
