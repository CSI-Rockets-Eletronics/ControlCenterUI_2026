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
        label="GN2 STANDBY"
        type="fs-command"
        executeCommand="STATE_GN2_STANDBY"
        stopCommand={null}
      />
      <LaunchControlEntry label="ARM" type="arm" field="commandCenter" />

      {manualFire ? (
        <>
          <LaunchControlEntry
            label="FIRE DOME PILOT OPEN"
            fadeIfDisabled
            type="fs-command"
            executeCommand="STATE_FIRE_MANUAL_DOME_PILOT_OPEN"
            stopCommand="STATE_GN2_STANDBY"
          />
          <LaunchControlEntry
            label="FIRE DOME PILOT CLOSE"
            fadeIfDisabled
            type="fs-command"
            executeCommand="STATE_FIRE_MANUAL_DOME_PILOT_CLOSE"
            stopCommand="STATE_GN2_STANDBY"
          />
          <LaunchControlEntry
            label="FIRE IGNITER"
            fadeIfDisabled
            type="fs-command"
            executeCommand="STATE_FIRE_MANUAL_IGNITER"
            stopCommand="STATE_GN2_STANDBY"
          />
          <LaunchControlEntry
            label="FIRE RUN"
            fadeIfDisabled
            type="fs-command"
            executeCommand="STATE_FIRE_MANUAL_RUN"
            stopCommand="STATE_GN2_STANDBY"
          />
        </>
      ) : (
        <LaunchControlEntry
          label="FIRE"
          fadeIfDisabled
          type="fs-command"
          executeCommand="STATE_FIRE"
          stopCommand="STATE_GN2_STANDBY"
        />
      )}
    </Panel>
  );
});
