import { memo, useEffect, useState } from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";

type SolenoidField =
  | "gn2_drain"
  | "gn2_fill"
  | "depress"
  | "press_pilot"
  | "run"
  | "lox_fill"
  | "lox_disconnect"
  | "igniter"
  | "igniter_backup"; // replaced ereg_power

const SOLENOID_LABELS: Record<SolenoidField, string> = {
  gn2_drain: "GN2 Drain",
  gn2_fill: "GN2 Fill",
  depress: "Depress",
  press_pilot: "Press Pilot",
  run: "Run",
  lox_fill: "LOX Fill",
  lox_disconnect: "LOX Disconnect",
  igniter: "Igniter",
  igniter_backup: "Igniter Backup", // replaced ereg_power
};

// Depress (pilot valve) pulse timing
const PILOT_VALVE_OPEN_MS = 1000;
const PILOT_VALVE_CLOSED_MS = 9000;

// GN2 fill pulse timing
const GN2_FILL_OPEN_MS = 5000;
const GN2_FILL_CLOSED_MS = 5000;

// Pulse fill durations (must match kFillA/B/CPulseDurationMs in dev_fs_relays.h)
const FILL_A_PULSE_MS = 500;
const FILL_B_PULSE_MS = 1000;
const FILL_C_PULSE_MS = 5000;

// FIRE timing (must match constants in dev_fs_relays.h)
const FIRE_IGNITER_ON_MS = 3000; // kFireIgniterOnDelayMs
const FIRE_IGNITER_OFF_MS = 3500; // kFireIgniterOffDelayMs (500ms pulse)
const FIRE_IGNITER_BACKUP_ON_MS = 4000; // primary on + 1000ms
const FIRE_IGNITER_BACKUP_OFF_MS = 4500; // primary off + 1000ms
const FIRE_RUN_OPEN_MS = 10000; // kFireRunOpenDelayMs
const FIRE_BACK_TO_STANDBY_MS = 30000; // kFireBackToStandbyDelayMs

const MAX_CUSTOM_OPEN_MS = 30000;

interface TimerInfo {
  countdown: number;
  isOpen: boolean;
}

interface SolenoidRowProps {
  field: SolenoidField;
  label: string;
  timer: TimerInfo | null;
}

const SolenoidRow = memo(function SolenoidRow({
  label,
  timer,
}: SolenoidRowProps) {
  if (!timer) {
    return (
      <div className="flex items-center justify-between px-2 border rounded py-1.5 border-gray-border bg-gray-el-bg">
        <div className="flex items-center flex-1 gap-2">
          <div className="w-2 h-2 rounded-full shrink-0 bg-gray-solid" />
          <span className="text-xs text-gray-text">{label}</span>
        </div>
        <span className="font-mono text-xs text-gray-text-dim">—</span>
      </div>
    );
  }

  const displayTime =
    timer.countdown === Infinity
      ? "∞"
      : (() => {
          const seconds = Math.ceil(timer.countdown / 1000);
          const tenths = Math.floor((timer.countdown % 1000) / 100);
          return seconds > 0 ? `${seconds}.${tenths}s` : "0.0s";
        })();

  return (
    <div className="flex items-center justify-between px-2 border rounded py-1.5 border-gray-border bg-gray-el-bg">
      <div className="flex items-center flex-1 gap-2">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${timer.isOpen ? "bg-green-solid" : "bg-yellow-solid"}`}
        />
        <span className="text-xs text-gray-text">{label}</span>
      </div>
      <span
        className={`text-xs font-mono font-bold tabular-nums ${timer.isOpen ? "text-green-text" : "text-yellow-text"}`}
      >
        {timer.isOpen ? displayTime : `↻ ${displayTime}`}
      </span>
    </div>
  );
});

export const SolenoidTimers = memo(function SolenoidTimers() {
  const fsStateRecord = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState,
  );

  const [stateEnterTime, setStateEnterTime] = useState<number>(Date.now());
  const [depressPulseEnterTime, setDepressPulseEnterTime] = useState<number>(
    Date.now(),
  );
  const [lastState, setLastState] = useState<string>("");
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!fsStateRecord?.data) return;

    const currentState = fsStateRecord.data.state;
    if (currentState !== lastState) {
      const now = Date.now();
      setStateEnterTime(now);

      const shouldPulseNew = [
        "GN2_STANDBY",
        "GN2_FILL",
        "GN2_PULSE_FILL_A",
        "GN2_PULSE_FILL_B",
        "GN2_PULSE_FILL_C",
      ].includes(currentState);
      const shouldPulseOld = [
        "GN2_STANDBY",
        "GN2_FILL",
        "GN2_PULSE_FILL_A",
        "GN2_PULSE_FILL_B",
        "GN2_PULSE_FILL_C",
      ].includes(lastState);

      if (shouldPulseNew && !shouldPulseOld) {
        setDepressPulseEnterTime(now);
      }

      setLastState(currentState);
    }
  }, [fsStateRecord?.data?.state, lastState]);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (!fsStateRecord?.data) {
    return (
      <div className="p-4 border bg-gray-el-bg rounded-xl border-gray-border">
        <p className="text-sm text-gray-text-dim">
          Waiting for solenoid data...
        </p>
      </div>
    );
  }

  const fsState = fsStateRecord.data;
  const currentState = fsState.state;
  const timeInStateMs = Date.now() - stateEnterTime;
  const timeInDepressPulseMs = Date.now() - depressPulseEnterTime;

  const timers: Record<SolenoidField, TimerInfo | null> = {
    gn2_drain: null,
    gn2_fill: null,
    depress: null,
    press_pilot: null,
    run: null,
    lox_fill: null,
    lox_disconnect: null,
    igniter: null,
    igniter_backup: null, // replaced ereg_power
  };

  // Depress (pilot valve) pulse: 1s open, 9s closed
  const shouldPulse = [
    "GN2_STANDBY",
    "GN2_FILL",
    "GN2_PULSE_FILL_A",
    "GN2_PULSE_FILL_B",
    "GN2_PULSE_FILL_C",
  ].includes(currentState);

  if (shouldPulse) {
    const pulsePeriod = PILOT_VALVE_OPEN_MS + PILOT_VALVE_CLOSED_MS;
    const timeInPulse = timeInDepressPulseMs % pulsePeriod;
    const isOpen = timeInPulse < PILOT_VALVE_OPEN_MS;
    const countdown = Math.max(
      0,
      isOpen ? PILOT_VALVE_OPEN_MS - timeInPulse : pulsePeriod - timeInPulse,
    );
    timers.depress = { countdown, isOpen };
  }

  if (currentState === "GN2_FILL") {
    const pulsePeriod = GN2_FILL_OPEN_MS + GN2_FILL_CLOSED_MS;
    const timeInPulse = timeInStateMs % pulsePeriod;
    const isOpen = timeInPulse < GN2_FILL_OPEN_MS;
    const countdown = Math.max(
      0,
      isOpen ? GN2_FILL_OPEN_MS - timeInPulse : pulsePeriod - timeInPulse,
    );
    timers.gn2_fill = { countdown, isOpen };
  }

  if (currentState === "GN2_PULSE_FILL_A") {
    timers.gn2_fill = {
      countdown: Math.max(0, FILL_A_PULSE_MS - timeInStateMs),
      isOpen: true,
    };
  }

  if (currentState === "GN2_PULSE_FILL_B") {
    timers.gn2_fill = {
      countdown: Math.max(0, FILL_B_PULSE_MS - timeInStateMs),
      isOpen: true,
    };
  }

  if (currentState === "GN2_PULSE_FILL_C") {
    timers.gn2_fill = {
      countdown: Math.max(0, FILL_C_PULSE_MS - timeInStateMs),
      isOpen: true,
    };
  }

  if (currentState === "FIRE") {
    // Primary igniter: on at T+3s, off at T+3.5s (500ms pulse)
    if (
      timeInStateMs >= FIRE_IGNITER_ON_MS &&
      timeInStateMs < FIRE_IGNITER_OFF_MS
    ) {
      timers.igniter = {
        countdown: FIRE_IGNITER_OFF_MS - timeInStateMs,
        isOpen: true,
      };
    }

    // Backup igniter: on at T+4s, off at T+4.5s (1s after primary)
    if (
      timeInStateMs >= FIRE_IGNITER_BACKUP_ON_MS &&
      timeInStateMs < FIRE_IGNITER_BACKUP_OFF_MS
    ) {
      timers.igniter_backup = {
        countdown: FIRE_IGNITER_BACKUP_OFF_MS - timeInStateMs,
        isOpen: true,
      };
    }

    // Run: opens at T+10s
    if (timeInStateMs >= FIRE_RUN_OPEN_MS) {
      timers.run = {
        countdown: FIRE_BACK_TO_STANDBY_MS - timeInStateMs,
        isOpen: true,
      };
    }
  }

  if (currentState === "ABORT") {
    if (fsState.gn2_drain) {
      timers.gn2_drain = { countdown: Infinity, isOpen: true };
    }
    if (fsState.depress) {
      timers.depress = { countdown: Infinity, isOpen: true };
    }
  }

  if (currentState === "CUSTOM") {
    const countdown = Math.max(0, MAX_CUSTOM_OPEN_MS - timeInStateMs);

    if (fsState.gn2_drain) timers.gn2_drain = { countdown, isOpen: true };
    if (fsState.gn2_fill) timers.gn2_fill = { countdown, isOpen: true };
    if (fsState.depress) timers.depress = { countdown, isOpen: true };
    if (fsState.press_pilot) timers.press_pilot = { countdown, isOpen: true };
    if (fsState.run) timers.run = { countdown, isOpen: true };
    if (fsState.lox_fill) timers.lox_fill = { countdown, isOpen: true };
    if (fsState.lox_disconnect)
      timers.lox_disconnect = { countdown, isOpen: true };
    if (fsState.igniter) timers.igniter = { countdown, isOpen: true };
    if (fsState.igniter_backup)
      timers.igniter_backup = { countdown, isOpen: true }; // replaced ereg_power
  }

  const fields: SolenoidField[] = [
    "gn2_drain",
    "gn2_fill",
    "depress",
    "press_pilot",
    "run",
    "lox_fill",
    "lox_disconnect",
    "igniter",
    "igniter_backup", // replaced ereg_power
  ];

  return (
    <div className="flex flex-col p-3 border bg-gray-el-bg rounded-xl border-gray-border gap-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-gray-text">Solenoid Timers</p>
        <p className="font-mono text-xs text-gray-text-dim">{currentState}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {fields.map((field) => (
          <SolenoidRow
            key={field}
            field={field}
            label={SOLENOID_LABELS[field]}
            timer={timers[field]}
          />
        ))}
      </div>
    </div>
  );
});
