import { memo } from "react";

import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

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
    <Panel>
      <p className="text-lg text-gray-text">Current State: {currentState}</p>
    </Panel>
  );
});
