import { memo } from "react";

import { useLaunchMachineSelector } from "./launchMachineProvider";
import PreFirePanel from "./preFirePanel";
import RecoveryPanel from "./recoveryPanel";
import SyncStatusBanner from "./syncStatusBanner";

export default memo(function ControlCenter() {
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

  const isPreFire = isStandby || isLaunch;

  const mainPanel = isPreFire ? (
    <PreFirePanel isLaunch={isLaunch} />
  ) : (
    <RecoveryPanel />
  );

  return (
    <div className="flex flex-col h-full">
      <div>
        <p>Current State: {currentState}</p>
      </div>
      <div className="grow">{mainPanel}</div>
      <SyncStatusBanner />
    </div>
  );
});
