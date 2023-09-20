import { memo } from "react";

import { Panel } from "./design/panel";
import { LaunchControlEntry } from "./launchControlEntry";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const LaunchCommandCenter = memo(function LaunchCommandCenter() {
  const manualFire = useLaunchMachineSelector(
    (state) => state.context.launchState.mainStatus.manualFire,
  );

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

      {manualFire ? (
        <>
          <LaunchControlEntry
            label="FIRE IGNITER"
            fadeIfDisabled
            type="opState"
            executeOpState="fire-manual-igniter"
            stopOpState="standby"
          />
          <LaunchControlEntry
            label="FIRE VALVE"
            fadeIfDisabled
            type="opState"
            executeOpState="fire-manual-valve"
            stopOpState="standby"
          />
        </>
      ) : (
        <LaunchControlEntry
          label="FIRE"
          fadeIfDisabled
          type="opState"
          executeOpState="fire"
          stopOpState="standby"
        />
      )}
    </Panel>
  );
});
