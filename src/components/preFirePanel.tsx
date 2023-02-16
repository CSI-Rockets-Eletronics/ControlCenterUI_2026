import { memo } from "react";

import { GoPoll } from "./goPoll";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFireLaunchPanel } from "./preFireLaunchPanel";
import { PreFireStandbyPanel } from "./preFireStandbyPanel";

export const PreFirePanel = memo(function PreFirePanel() {
  const isLaunch = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.launch")
  );

  return (
    <div className="grid grid-cols-[1fr,2fr] gap-4">
      <GoPoll />
      {isLaunch ? <PreFireLaunchPanel /> : <PreFireStandbyPanel />}
    </div>
  );
});
