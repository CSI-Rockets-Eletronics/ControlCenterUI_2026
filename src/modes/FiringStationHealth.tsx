import { memo, useCallback, useEffect, useState } from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";

interface Props {
  onClose: () => void;
}

interface ChannelData {
  state: boolean;
  current: number; // A
  label: string;
}

type Status = "ok" | "warning" | "fault" | "none";

/** Current thresholds (A). */
const WARN_A = 2.8;
const FAULT_A = 3.2;
const MAX_A = 10;

const channelStatus = (current: number): Status =>
  current > FAULT_A ? "fault" : current > WARN_A ? "warning" : "ok";

/** Status pill, same palette as the rest of the app. */
const PILL: Record<Status, string> = {
  ok: "ui-open",
  warning: "bg-yellow-bg text-yellow-text",
  fault: "bg-red-solid text-white",
  none: "bg-gray-el-bg text-gray-text-dim",
};

const DOT: Record<Status, string> = {
  ok: "ui-dot-on",
  warning: "bg-yellow-solid",
  fault: "bg-red-solid",
  none: "bg-gray-solid",
};

function Pill({ status, children }: { status: Status; children: string }) {
  return (
    <span
      className={`inline-flex items-center h-7 px-3 text-sm font-semibold rounded-md whitespace-nowrap ${PILL[status]}`}
    >
      {children}
    </span>
  );
}

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const FiringStationHealth = memo(function FiringStationHealth({
  onClose,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  // Esc closes, like the other dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );
  const relay = useLaunchMachineSelector(
    (state) => state.context.deviceStates.relayCurrentMonitor?.data,
  );

  const channels: ChannelData[] = relay
    ? [
        ["GN2 Drain", fsState?.gn2_drain, relay.gn2_drain_ma],
        ["GN2 Fill", fsState?.gn2_fill, relay.gn2_fill_ma],
        ["Depress", fsState?.depress, relay.depress_ma],
        ["Press Pilot", fsState?.press_pilot, relay.press_pilot_ma],
        ["Run", fsState?.run, relay.run_ma],
        ["LOX Fill", fsState?.lox_fill, relay.lox_fill_ma],
        ["LOX Disconnect", fsState?.lox_disconnect, relay.lox_disconnect_ma],
        ["Igniter", fsState?.igniter, relay.igniter_ma],
        // optional in the record schema; only shown when the board sends it
        ...(relay.igniter_backup_ma !== undefined
          ? [
              [
                "Igniter Backup",
                fsState?.igniter_backup,
                relay.igniter_backup_ma,
              ] as const,
            ]
          : []),
      ].map(([label, state, ma]) => ({
        label: label as string,
        state: !!state,
        current: (ma as number) / 1000,
      }))
    : [];

  const hasData = !!relay;
  const worst: Status = !hasData
    ? "none"
    : channels.some((c) => c.current > FAULT_A)
      ? "fault"
      : channels.some((c) => c.current > WARN_A)
        ? "warning"
        : "ok";
  const overallLabel = {
    none: "No data",
    ok: "OK",
    warning: "Warning",
    fault: "Fault",
  }[worst];
  const overcurrent = channels.some((c) => c.current > FAULT_A);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fs-health-title"
        onMouseDown={stopPropagation}
        className="flex flex-col w-full max-w-3xl p-6 rounded-lg max-h-[90vh] ui-section"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="fs-health-title" className="ui-section-title">
            Firing station health
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center h-10 px-4 text-sm font-semibold rounded-lg gap-2 bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text"
          >
            Close
            <kbd className="font-sans text-xs text-gray-text-dim">Esc</kbd>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 scrollbar-thin">
          {/* Overall */}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-bg-2 rounded-card">
            <div>
              <div className="text-sm text-gray-text-dim">Overall</div>
              <div className="text-3xl font-semibold tracking-[-0.02em] text-gray-text">
                {overallLabel}
              </div>
            </div>
            <span className={`w-3 h-3 rounded-full ${DOT[worst]}`} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-bg-2 rounded-card">
              <span className="text-sm font-medium text-gray-text">
                I2C error
              </span>
              {/* not wired to the backend yet (was hard-coded to "NO") */}
              <Pill status="none">Not monitored</Pill>
            </div>
            <div className="flex items-center justify-between px-5 py-4 bg-gray-bg-2 rounded-card">
              <span className="text-sm font-medium text-gray-text">
                Overcurrent
              </span>
              {hasData ? (
                <Pill status={overcurrent ? "fault" : "ok"}>
                  {overcurrent ? "Yes" : "No"}
                </Pill>
              ) : (
                <Pill status="none">No data</Pill>
              )}
            </div>
          </div>

          {!hasData && (
            <div className="px-5 py-4 text-sm rounded-card bg-yellow-bg text-yellow-text">
              <div className="font-semibold">No current monitoring data</div>
              <div className="opacity-80">
                Waiting for data from RelayCurrentMonitor…
              </div>
            </div>
          )}

          {/* Channels */}
          <button
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className="flex items-center justify-between w-full h-12 px-5 text-sm font-medium bg-gray-bg-2 rounded-card hover:bg-gray-el-bg-hover text-gray-text"
          >
            Channel details
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              aria-hidden
              className={expanded ? "rotate-180" : ""}
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

          {expanded &&
            (hasData ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {channels.map((ch) => {
                  const status = channelStatus(ch.current);
                  return (
                    <div
                      key={ch.label}
                      className="px-4 py-3 bg-gray-bg-2 rounded-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-text">
                          {ch.label}
                        </span>
                        <span
                          className={`w-14 py-0.5 text-center text-xs font-semibold rounded-md ${
                            ch.state
                              ? "ui-open"
                              : "bg-gray-el-bg text-gray-text-dim"
                          }`}
                        >
                          {ch.state ? "On" : "Off"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${DOT[status]}`}
                        />
                        <span className="text-lg font-semibold tabular-nums text-gray-text">
                          {ch.current.toFixed(2)}
                          <span className="ml-1 text-xs font-normal text-gray-text-dim">
                            A
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-4 text-sm bg-gray-bg-2 rounded-card text-gray-text-dim">
                No channel data yet.
              </div>
            ))}

          {/* Thresholds */}
          <div className="flex flex-wrap items-center px-1 pt-2 text-xs gap-x-4 gap-y-1 text-gray-text-dim">
            <span className="font-medium text-gray-text">Thresholds</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${DOT.ok}`} />
              Normal ≤ {WARN_A} A
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${DOT.warning}`} />
              Warning {WARN_A}–{FAULT_A} A
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${DOT.fault}`} />
              Fault &gt; {FAULT_A} A
            </span>
            <span>Max {MAX_A} A</span>
          </div>
        </div>
      </div>
    </div>
  );
});
