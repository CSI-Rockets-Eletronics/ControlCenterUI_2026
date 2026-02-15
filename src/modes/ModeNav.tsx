import { memo } from "react";
import { Link, useParams } from "react-router-dom";

import { useLaunchMachineSelector } from "@/components/launchMachineProvider";
import { useTelemetryStore } from "@/stores/telemetryStore";

interface Props {
  currentPath: string;
}

export const ModeNav = memo(function ModeNav({ currentPath }: Props) {
  const connected = useTelemetryStore((state) => state.connected);
  const { environmentKey } = useParams<{ environmentKey: string }>();

  const msSinceBoot = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.ms_since_boot ?? null,
  );
  const uptimeSeconds =
    msSinceBoot !== null ? Math.floor(msSinceBoot / 1000) : null;

  const isControl = currentPath.includes("/control");
  const isData = currentPath.includes("/data");

  return (
    <nav className="border-b border-gray-border bg-gray-bg-1">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold tracking-tight text-gray-text">
            Rocket Control Center
          </div>

          {/* Connection status */}
          <div
            className={`ml-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              connected
                ? "bg-green-bg text-green-text"
                : "bg-red-bg text-red-text"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-solid animate-pulse" : "bg-red-solid"}`}
            />
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </div>

          <div className="px-3 py-1 ml-2 text-xs rounded-full bg-gray-bg-2 text-gray-text-dim tabular-nums">
            FS UP: {uptimeSeconds !== null ? `${uptimeSeconds}s` : "—"}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/${environmentKey}/control`}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isControl
                ? "bg-blue-solid text-white shadow-lg"
                : "bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
            }`}
          >
            CONTROL
          </Link>
          <Link
            to={`/${environmentKey}/data`}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isData
                ? "bg-blue-solid text-white shadow-lg"
                : "bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
            }`}
          >
            DATA DISPLAY
          </Link>
        </div>
      </div>
    </nav>
  );
});
