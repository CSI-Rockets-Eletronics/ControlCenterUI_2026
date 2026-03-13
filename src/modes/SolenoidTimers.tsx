import { memo, useCallback, useEffect, useState } from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";

interface SolenoidTimer {
  label: string;
  field:
    | "gn2_drain"
    | "gn2_fill"
    | "depress"
    | "press_pilot"
    | "run"
    | "lox_fill"
    | "lox_disconnect"
    | "igniter";
  state: boolean;
  elapsedMs: number;
}

const SOLENOID_LABELS: Record<string, string> = {
  gn2_drain: "GN2 Drain",
  gn2_fill: "GN2 Fill",
  depress: "Depress",
  press_pilot: "Press Pilot",
  run: "Run",
  lox_fill: "LOX Fill",
  lox_disconnect: "LOX Disc",
  igniter: "Igniter",
};

interface SolenoidRowProps {
  timer: SolenoidTimer;
  onReset: (field: SolenoidTimer["field"]) => void;
}

const SolenoidRow = memo(function SolenoidRow({
  timer,
  onReset,
}: SolenoidRowProps) {
  const handleReset = useCallback(() => {
    onReset(timer.field);
  }, [timer.field, onReset]);

  const seconds = Math.floor(timer.elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;

  const timeDisplay =
    minutes > 0
      ? `${minutes}:${displaySeconds.toString().padStart(2, "0")}`
      : `${seconds}s`;

  return (
    <div className="flex items-center justify-between px-2 py-1 border rounded border-gray-border bg-gray-el-bg">
      <div className="flex items-center flex-1 min-w-0 gap-2">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${timer.state ? "bg-green-solid" : "bg-gray-solid"}`}
        />
        <span className="text-xs truncate text-gray-text">{timer.label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-xs text-right text-gray-text-dim tabular-nums min-w-[3rem]">
          {timeDisplay}
        </span>
        <button
          onClick={handleReset}
          className="px-2 text-xs text-white rounded py-0.5 bg-blue-solid hover:bg-blue-solid-hover transition-colors"
        >
          ↻
        </button>
      </div>
    </div>
  );
});

export const SolenoidTimers = memo(function SolenoidTimers() {
  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );

  const [stateTimestamps, setStateTimestamps] = useState<
    Record<string, number>
  >({});
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!fsState) return;

    const now = Date.now();
    const fields: Array<SolenoidTimer["field"]> = [
      "gn2_drain",
      "gn2_fill",
      "depress",
      "press_pilot",
      "run",
      "lox_fill",
      "lox_disconnect",
      "igniter",
    ];

    setStateTimestamps((prev) => {
      const next = { ...prev };
      let changed = false;

      fields.forEach((field) => {
        const currentState = fsState[field];
        const key = `${field}_${currentState}`;

        if (!(key in prev)) {
          next[key] = now;
          changed = true;
        }

        const oppositeKey = `${field}_${!currentState}`;
        if (oppositeKey in prev) {
          delete next[oppositeKey];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [fsState]);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleReset = useCallback(
    (field: SolenoidTimer["field"]) => {
      if (!fsState) return;
      const currentState = fsState[field];
      const key = `${field}_${currentState}`;
      setStateTimestamps((prev) => ({
        ...prev,
        [key]: Date.now(),
      }));
    },
    [fsState],
  );

  if (!fsState) {
    return (
      <div className="p-4 border bg-gray-el-bg rounded-xl border-gray-border">
        <p className="text-sm text-gray-text-dim">
          Waiting for solenoid data...
        </p>
      </div>
    );
  }

  const now = Date.now();
  const fields: Array<SolenoidTimer["field"]> = [
    "gn2_drain",
    "gn2_fill",
    "depress",
    "press_pilot",
    "run",
    "lox_fill",
    "lox_disconnect",
    "igniter",
  ];

  const timers: SolenoidTimer[] = fields.map((field) => {
    const state = fsState[field];
    const key = `${field}_${state}`;
    const timestamp = stateTimestamps[key] || now;
    const elapsedMs = now - timestamp;

    return {
      label: SOLENOID_LABELS[field],
      field,
      state,
      elapsedMs,
    };
  });

  return (
    <div className="flex flex-col p-3 border bg-gray-el-bg rounded-xl border-gray-border gap-2">
      <p className="mb-1 text-sm font-bold text-gray-text">Solenoid timers</p>
      <div className="grid grid-cols-2 gap-1.5">
        {timers.map((timer) => (
          <SolenoidRow key={timer.field} timer={timer} onReset={handleReset} />
        ))}
      </div>
    </div>
  );
});
