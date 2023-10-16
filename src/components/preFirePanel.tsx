import { memo } from "react";

import { CautionPanel } from "./cautionPanel";
import { GoPoll } from "./goPoll";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFireLaunchPanel } from "./preFireLaunchPanel";
import { PreFireStandbyPanel } from "./preFireStandbyPanel";
import { StatusPanel } from "./statusPanel";

export const PreFirePanel = memo(function PreFirePanel() {
  const isLaunch = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "launch",
  );

  return (
    <div className="grid grid-rows-[auto,auto,auto] md:grid-rows-none md:grid-cols-[1fr,2fr,1fr] gap-4">
      <div className="grid grid-rows-[auto,1fr] gap-4">
        <CautionPanel />
        <GoPoll />
      </div>
      {isLaunch ? <PreFireLaunchPanel /> : <PreFireStandbyPanel />}
      <StatusPanel />
    </div>
  );
});
