import { memo } from "react";

import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFirePanel } from "./preFirePanel";
import { RecoveryPanel } from "./recoveryPanel";
import { TopStatusPanel } from "./topStatusPanel";

export const ControlCenter = memo(function ControlCenter() {
  const isPreFire = useLaunchMachineSelector(
    (state) =>
      state.matches("preFire.operationState.standby") ||
      state.matches("preFire.operationState.launch")
  );

  const mainPanel = isPreFire ? <PreFirePanel /> : <RecoveryPanel />;

  return (
    <div className="h-full p-4 grid grid-rows-[auto,1fr] gap-4">
      <TopStatusPanel />
      {mainPanel}
    </div>
  );
});
