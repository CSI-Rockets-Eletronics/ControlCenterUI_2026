import { memo } from "react";

import { GoPoll } from "./goPoll";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFireLaunchPanel } from "./preFireLaunchPanel";
import { PreFireStandbyPanel } from "./preFireStandbyPanel";
import { StatusPanel } from "./statusPanel";

export const PreFirePanel = memo(function PreFirePanel() {
  const isLaunch = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "launch"
  );

  return (
    <div className="grid grid-cols-[1fr,2fr,1fr] gap-4">
      <GoPoll />
      {isLaunch ? <PreFireLaunchPanel /> : <PreFireStandbyPanel />}
      <StatusPanel />
    </div>
  );
});
