import { memo } from "react";

import { Panel } from "./design/panel";
import { LaunchControlEntry } from "./launchControlEntry";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const LaunchCommandCenter = memo(function LaunchCommandCenter() {
  const fireDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "MUTATE_STATION_OP_STATE",
        value: "fire",
      })
  );

  return (
    <Panel className="flex flex-col gap-3">
      <p className="text-lg text-gray-text">Command Center</p>
      <LaunchControlEntry
        label="KEEP"
        type="opState"
        executeOpState="keep"
        stopOpState="standby" // TODO standby for stop?
      />
      <LaunchControlEntry label="ARM" type="arm" field="commandCenter" />
      <LaunchControlEntry
        label="FIRE"
        disabled={fireDisabled}
        type="opState"
        executeOpState="fire"
        stopOpState="standby" // TODO standby for stop?
      />
    </Panel>
  );
});
