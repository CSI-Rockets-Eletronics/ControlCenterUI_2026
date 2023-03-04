import { memo } from "react";

import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFirePanel } from "./preFirePanel";
import { RecoveryPanel } from "./recoveryPanel";
import { TopStatusPanel } from "./topStatusPanel";

export const ControlCenter = memo(function ControlCenter() {
  const isRecovery = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "recovery"
  );

  const mainPanel = isRecovery ? <RecoveryPanel /> : <PreFirePanel />;

  return (
    <div className="h-full p-4 overflow-auto grid grid-rows-[auto,1fr] gap-4">
      <TopStatusPanel />
      {mainPanel}
    </div>
  );
});
