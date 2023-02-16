import { memo } from "react";

import { LaunchAbortControl } from "./launchAbortControl";
import { LaunchCommandCenter } from "./launchCommandCenter";

export const PreFireLaunchPanel = memo(function PreFireLaunchPanel() {
  return (
    <div className="grid grid-rows-[auto,auto] gap-4">
      <LaunchCommandCenter />
      <LaunchAbortControl />
    </div>
  );
});
