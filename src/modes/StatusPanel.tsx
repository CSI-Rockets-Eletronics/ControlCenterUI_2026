import { memo } from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";

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
  const dotColors = {
    ok: "bg-green-solid",
    warning: "bg-yellow-solid animate-pulse",
    error: "bg-red-solid animate-pulse",
    disconnected: "bg-gray-solid",
  };

  return (
    <div className="flex items-center px-3 py-2 border rounded-lg gap-2 bg-gray-bg-2 border-gray-border">
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColors[status]}`}
      />
      <div className="flex flex-col min-w-0">
        <div className="text-xs truncate text-gray-text-dim">{label}</div>
        <div className="text-sm font-semibold truncate text-gray-text">
          {value}
        </div>
      </div>
    </div>
  );
});

export const StatusPanel = memo(function StatusPanel() {
  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );

  const getRelayStatus = (
    value: boolean | undefined,
  ): "ok" | "error" | "disconnected" => {
    if (value === undefined) return "disconnected";
    return value ? "ok" : "error";
  };

  return (
    <div className="flex flex-col h-full p-3 overflow-hidden border bg-gray-el-bg rounded-xl border-gray-border">
      <h2 className="mb-3 text-xs font-bold tracking-widest uppercase text-gray-text">
        SYSTEM STATUS
      </h2>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full grid grid-cols-10 gap-2">
          <StatusItem
            label="STATE"
            value={fsState?.state || "UNKNOWN"}
            status={fsState ? "ok" : "disconnected"}
          />

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
            label="LOX FILL"
            value={fsState?.lox_fill ? "OPEN" : "CLOSED"}
            status={getRelayStatus(fsState?.lox_fill)}
          />
          <StatusItem
            label="LOX DISC"
            value={fsState?.lox_disconnect ? "OPEN" : "CLOSED"}
            status={getRelayStatus(fsState?.lox_disconnect)}
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
          <StatusItem
            label="EREG PWR"
            value={fsState?.ereg_power ? "ON" : "OFF"}
            status={getRelayStatus(fsState?.ereg_power)}
          />
        </div>
      </div>
    </div>
  );
});
