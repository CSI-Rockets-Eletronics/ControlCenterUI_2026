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

  const handleGoToStandbyMode = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_ACTIVE_PANEL",
      value: "standby",
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

      <div className="flex justify-end mt-4">
        <Button
          color="green"
          disabled={goToStandbyModeDisabled}
          onClick={handleGoToStandbyMode}
        >
          RETURN TO STANDBY MODE
        </Button>
      </div>
    </Panel>
  );
});
