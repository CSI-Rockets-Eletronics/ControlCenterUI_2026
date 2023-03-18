import { memo, useCallback } from "react";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { LaunchControlEntry } from "./launchControlEntry";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

export const LaunchAbortControl = memo(function LaunchAbortControl() {
  const launchActorRef = useLaunchMachineActorRef();

  const goToStandbyModeDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_ACTIVE_PANEL",
        value: "standby",
      })
  );

  const goToRecoveryModeDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_ACTIVE_PANEL",
        value: "recovery",
      })
  );

  const handleGoToStandbyMode = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_ACTIVE_PANEL",
      value: "standby",
    });
  }, [launchActorRef]);

  const handleGoToRecoveryMode = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_ACTIVE_PANEL",
      value: "recovery",
    });
  }, [launchActorRef]);

  return (
    <Panel className="flex flex-col gap-3">
      <p className="text-lg text-gray-text">Abort Control</p>
      <LaunchControlEntry label="ARM" type="arm" field="abortControl" />
      <LaunchControlEntry
        label="ABORT"
        isAbort
        type="opState"
        executeOpState="abort"
        stopOpState={null}
      />

      <div className="flex flex-col justify-between mt-4 md:flex-row gap-4">
        <Button
          color="green"
          disabled={goToStandbyModeDisabled}
          onClick={handleGoToStandbyMode}
        >
          RETURN TO STANDBY MODE
        </Button>
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
