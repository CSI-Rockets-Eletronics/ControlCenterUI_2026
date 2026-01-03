import { memo } from "react";

import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFireLaunchPanel } from "./preFireLaunchPanel";
import { PreFireStandbyPanel } from "./preFireStandbyPanel";
import { StatusPanel } from "./statusPanel";

export const PreFirePanel = memo(function PreFirePanel() {
  const isLaunch = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "launch",
  );

  return (
    <div className="grid grid-rows-[auto,auto] md:grid-rows-none md:grid-cols-[1fr,3fr] gap-4">
      {isLaunch ? <PreFireLaunchPanel /> : <PreFireStandbyPanel />}
      <StatusPanel />
    </div>
  );
});
