import { memo, useCallback, useState } from "react";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";

interface Props {
  onClose: () => void;
}

interface ChannelData {
  state: boolean;
  current: number;
  label: string;
}

export const FiringStationHealth = memo(function FiringStationHealth({
  onClose,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );

  const relayCurrentData = useLaunchMachineSelector(
    (state) => state.context.deviceStates.relayCurrentMonitor?.data,
  );

  const channels: ChannelData[] = relayCurrentData
    ? [
        {
          label: "GN2 DRAIN",
          state: fsState?.gn2_drain ?? false,
          current: relayCurrentData.gn2_drain_ma / 1000,
        },
        {
          label: "GN2 FILL",
          state: fsState?.gn2_fill ?? false,
          current: relayCurrentData.gn2_fill_ma / 1000,
        },
        {
          label: "DEPRESS",
          state: fsState?.depress ?? false,
          current: relayCurrentData.depress_ma / 1000,
        },
        {
          label: "PRESS PILOT",
          state: fsState?.press_pilot ?? false,
          current: relayCurrentData.press_pilot_ma / 1000,
        },
        {
          label: "RUN",
          state: fsState?.run ?? false,
          current: relayCurrentData.run_ma / 1000,
        },
        {
          label: "LOX FILL",
          state: fsState?.lox_fill ?? false,
          current: relayCurrentData.lox_fill_ma / 1000,
        },
        {
          label: "LOX DISCONNECT",
          state: fsState?.lox_disconnect ?? false,
          current: relayCurrentData.lox_disconnect_ma / 1000,
        },
        {
          label: "IGNITER",
          state: fsState?.igniter ?? false,
          current: relayCurrentData.igniter_ma / 1000,
        },
      ]
    : [];

  const i2cError = false; // aruzhan TODO: i2c error  - connect to backend
  const overcurrent = channels.some((ch) => ch.current > 3.2);

  const overallHealth: "OK" | "Warning" | "Fault" = i2cError
    ? "Fault"
    : overcurrent
      ? "Warning"
      : "OK";

  const healthColors = {
    OK: "bg-white text-green-text border-green-solid border-2",
    Warning: "bg-white text-yellow-text border-yellow-solid border-2",
    Fault: "bg-white text-red-text border-red-solid border-2",
  };

  const getChannelStatus = (current: number): "ok" | "warning" | "fault" => {
    if (current > 3.2) return "fault";
    if (current > 2.8) return "warning";
    return "ok";
  };

  const statusColors = {
    ok: "bg-white text-green-text border-green-solid border-2",
    warning: "bg-white text-yellow-text border-yellow-solid border-2",
    fault: "bg-white text-red-text border-red-solid border-2",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl overflow-hidden border shadow-2xl bg-gray-el-bg rounded-2xl border-gray-border max-h-[90vh]">
        <div className="flex items-center justify-between p-6 bg-white border-b border-gray-border">
          <h2 className="text-2xl font-bold text-gray-text">
            FIRING STATION HEALTH
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text transition-colors border-gray-border"
          >
            CLOSE
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div
            className={`border rounded-xl p-6 ${healthColors[overallHealth]}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-2 text-sm opacity-70">OVERALL HEALTH</div>
                <div className="text-4xl font-bold">{overallHealth}</div>
              </div>
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                  overallHealth === "OK"
                    ? "bg-green-bg"
                    : overallHealth === "Warning"
                      ? "bg-yellow-bg"
                      : "bg-red-bg"
                }`}
              >
                {overallHealth === "OK"
                  ? "✓"
                  : overallHealth === "Warning"
                    ? "⚠"
                    : "✕"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className={`border rounded-lg p-4 ${i2cError ? statusColors.fault : statusColors.ok}`}
            >
              <div className="mb-1 text-xs opacity-70">I2C ERROR</div>
              <div className="text-2xl font-bold">
                {i2cError ? "YES" : "NO"}
              </div>
            </div>
            <div
              className={`border rounded-lg p-4 ${overcurrent ? statusColors.warning : statusColors.ok}`}
            >
              <div className="mb-1 text-xs opacity-70">OVERCURRENT</div>
              <div className="text-2xl font-bold">
                {overcurrent ? "YES" : "NO"}
              </div>
            </div>
          </div>

          {!relayCurrentData && (
            <div className="p-4 border-2 rounded-lg border-yellow-solid bg-yellow-bg text-yellow-text">
              <div className="mb-2 font-bold">⚠ NO CURRENT MONITORING DATA</div>
              <div className="text-sm">
                Waiting for data from RelayCurrentMonitor...
              </div>
            </div>
          )}

          <button
            onClick={handleToggleExpanded}
            className="flex items-center justify-between w-full px-6 py-4 font-semibold bg-white border rounded-xl hover:bg-gray-bg-2 text-gray-text transition-colors border-gray-border"
          >
            <span>CHANNEL DETAILS</span>
            <span className="text-2xl">{expanded ? "−" : "+"}</span>
          </button>

          {expanded && relayCurrentData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {channels.map((channel) => {
                const status = getChannelStatus(channel.current);

                return (
                  <div
                    key={channel.label}
                    className={`border rounded-lg p-4 ${statusColors[status]}`}
                  >
                    <div className="mb-2 text-xs opacity-70">
                      {channel.label}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">State:</span>
                        <span
                          className={`text-sm font-bold ${
                            channel.state
                              ? "text-green-solid"
                              : "text-gray-text-dim"
                          }`}
                        >
                          {channel.state ? "ON" : "OFF"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Current:</span>
                        <span className="text-sm font-bold">
                          {channel.current.toFixed(2)}A
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 text-xs border-t border-gray-border text-gray-text-dim">
            <p className="mb-1 font-semibold">Current Thresholds:</p>
            <p>• Normal: ≤ 2.8A (Green)</p>
            <p>• Warning: 2.8-3.2A (Yellow)</p>
            <p>• Fault: &gt; 3.2A (Red)</p>
            <p>• Maximum: 10A</p>
          </div>
        </div>
      </div>
    </div>
  );
});
