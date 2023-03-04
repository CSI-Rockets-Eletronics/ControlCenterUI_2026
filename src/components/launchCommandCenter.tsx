import { memo, useCallback } from "react";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { LaunchControlEntry } from "./launchControlEntry";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

export const LaunchCommandCenter = memo(function LaunchCommandCenter() {
  const launchActorRef = useLaunchMachineActorRef();

  const canFire = useLaunchMachineSelector((state) =>
    state.can({
      type: "MUTATE_STATION_OP_STATE",
      value: "fire",
    })
  );

  const goToRecoveryModeDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_ACTIVE_PANEL",
        value: "recovery",
      })
  );

  const handleGoToRecoveryMode = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_ACTIVE_PANEL",
      value: "recovery",
    });
  }, [launchActorRef]);

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
      {canFire && (
        <LaunchControlEntry
          label="FIRE"
          type="opState"
          executeOpState="fire"
          stopOpState="standby" // TODO standby for stop?
        />
      )}

      <div className="flex items-center mt-4 gap-4">
        <p className="flex-1 text-lg font-bold text-green-text-dim">
          LIFT OFF!!!
        </p>
        <Button
          color="green"
          disabled={goToRecoveryModeDisabled}
          onClick={handleGoToRecoveryMode}
        >
          GO TO RECOVERY MODE
        </Button>
      </div>
    </Panel>
  );
});
