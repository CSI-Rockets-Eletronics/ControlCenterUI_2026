import { memo } from "react";

import { Panel } from "./design/panel";
import { LaunchControlEntry } from "./launchControlEntry";

export const LaunchCommandCenter = memo(function LaunchCommandCenter() {
  return (
    <Panel className="flex flex-col gap-3">
      <p className="text-lg text-gray-text">Command Center</p>
      <LaunchControlEntry
        label="KEEP"
        type="opState"
        executeOpState="keep"
        stopOpState="standby"
      />
      <LaunchControlEntry label="ARM" type="arm" field="commandCenter" />
      <LaunchControlEntry
        label="FIRE"
        fadeIfDisabled
        type="opState"
        executeOpState="fire"
        stopOpState="standby"
      />
    </Panel>
  );
});
