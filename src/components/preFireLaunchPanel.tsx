import { memo } from "react";

import LaunchAbortControl from "./launchAbortControl";
import LaunchCommandCenter from "./launchCommandCenter";

export default memo(function PreFireLaunchPanel() {
  return (
    <div>
      <LaunchCommandCenter />
      <LaunchAbortControl />
    </div>
  );
});
