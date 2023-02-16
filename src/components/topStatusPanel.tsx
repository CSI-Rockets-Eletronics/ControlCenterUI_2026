import { memo } from "react";

import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { SyncStatusPanel } from "./syncStatusPanel";

export const TopStatusPanel = memo(function TopStatusPanel() {
  const isStandby = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby")
  );
  const isLaunch = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.launch")
  );
  const isRecovery = useLaunchMachineSelector((state) =>
    state.matches("recovery")
  );

  const currentState = isStandby
    ? "STANDBY"
    : isLaunch
    ? "LAUNCH"
    : isRecovery
    ? "RECOVERY"
    : "UNKNOWN";

  return (
    <div className="grid grid-cols-[1fr,auto] space-x-4">
      <Panel className="flex items-center">
        <p className="text-lg text-gray-text">Current State: {currentState}</p>
      </Panel>
      <SyncStatusPanel />
    </div>
  );
});
