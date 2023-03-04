import { memo } from "react";

import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { SyncStatusPanel } from "./syncStatusPanel";

export const TopStatusPanel = memo(function TopStatusPanel() {
  const activePanel = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel
  );

  const currentState = {
    standby: "STANDBY",
    launch: "LAUNCH",
    recovery: "RECOVERY",
  }[activePanel];

  return (
    <div className="grid grid-cols-[1fr,auto] space-x-4">
      <Panel className="flex items-center">
        <p className="text-lg text-gray-text">Current State: {currentState}</p>
      </Panel>
      <SyncStatusPanel />
    </div>
  );
});
