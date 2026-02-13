import { memo } from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";
import { useTelemetryStore } from "@/stores/telemetryStore";

interface StatusItemProps {
  label: string;
  value: string;
  status: "ok" | "warning" | "error" | "disconnected";
}

const StatusItem = memo(function StatusItem({
  label,
  value,
  status,
}: StatusItemProps) {
  const colors = {
    ok: "bg-white text-gray-text border-green-solid",
    warning: "bg-white text-gray-text border-yellow-solid",
    error: "bg-white text-gray-text border-red-solid",
    disconnected: "bg-white text-gray-text-dim border-gray-border",
  };

  const dotColors = {
    ok: "bg-green-solid",
    warning: "bg-yellow-solid animate-pulse",
    error: "bg-red-solid animate-pulse",
    disconnected: "bg-gray-solid",
  };

  return (
    <div className={`border-2 rounded-lg p-3 ${colors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs opacity-70">{label}</div>
        <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
});

export const StatusPanel = memo(function StatusPanel() {
  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );

  const latestLox = useTelemetryStore((state) =>
    state.getLatestSample("oxtank_1_psi"),
  );

  const latestChamber = useTelemetryStore((state) =>
    state.getLatestSample("upper_cc_psi"),
  );

  const latestLoadCell = useTelemetryStore((state) =>
    state.getLatestSample("total_load_lbs"),
  );

  const getRelayStatus = (
    value: boolean | undefined,
  ): "ok" | "error" | "disconnected" => {
    if (value === undefined) return "disconnected";
    return value ? "ok" : "error";
  };

  const getPressureStatus = (
    value: number | null,
    threshold: number,
  ): "ok" | "warning" | "disconnected" => {
    if (value === null) return "disconnected";
    return value > threshold ? "warning" : "ok";
  };

  return (
    <div className="flex flex-col h-full p-4 border bg-gray-el-bg rounded-xl border-gray-border">
      <h2 className="mb-4 text-lg font-bold text-gray-text">SYSTEM STATUS</h2>

      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        <div className="mb-4">
          <div className="mb-2 text-xs text-gray-text-dim">FIRING STATION</div>
          <StatusItem
            label="STATE"
            value={fsState?.state || "UNKNOWN"}
            status={fsState ? "ok" : "disconnected"}
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xs text-gray-text-dim">RELAYS</div>
          <div className="space-y-2">
            <StatusItem
              label="GN2 DRAIN"
              value={fsState?.gn2_drain ? "OPEN" : "CLOSED"}
              status={getRelayStatus(fsState?.gn2_drain)}
            />
            <StatusItem
              label="GN2 FILL"
              value={fsState?.gn2_fill ? "OPEN" : "CLOSED"}
              status={getRelayStatus(fsState?.gn2_fill)}
            />
            <StatusItem
              label="DEPRESS"
              value={fsState?.depress ? "OPEN" : "CLOSED"}
              status={getRelayStatus(fsState?.depress)}
            />
            <StatusItem
              label="PRESS PILOT"
              value={fsState?.press_pilot ? "OPEN" : "CLOSED"}
              status={getRelayStatus(fsState?.press_pilot)}
            />
            <StatusItem
              label="RUN"
              value={fsState?.run ? "OPEN" : "CLOSED"}
              status={getRelayStatus(fsState?.run)}
            />
            <StatusItem
              label="IGNITER"
              value={fsState?.igniter ? "ARMED" : "SAFE"}
              status={getRelayStatus(fsState?.igniter)}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xs text-gray-text-dim">PRESSURES</div>
          <div className="space-y-2">
            <StatusItem
              label="OXTANK 1 (PSI)"
              value={latestLox?.value.toFixed(1) || "--"}
              status={getPressureStatus(latestLox?.value || null, 800)}
            />
            <StatusItem
              label="UPPER CC (PSI)"
              value={latestChamber?.value.toFixed(1) || "--"}
              status={getPressureStatus(latestChamber?.value || null, 600)}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xs text-gray-text-dim">MECHANICAL</div>
          <StatusItem
            label="TOTAL LOAD (LBS)"
            value={latestLoadCell?.value.toFixed(2) || "--"}
            status={latestLoadCell ? "ok" : "disconnected"}
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xs text-gray-text-dim">UPTIME</div>
          <StatusItem
            label="TIME SINCE BOOT (s)"
            value={
              fsState ? ((fsState.ms_since_boot || 0) / 1000).toFixed(1) : "--"
            }
            status={fsState ? "ok" : "disconnected"}
          />
        </div>
      </div>
    </div>
  );
});
