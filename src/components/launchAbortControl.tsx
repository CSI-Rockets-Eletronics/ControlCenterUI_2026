import { memo, useCallback } from "react";

import { useCommandSender } from "./commandSenderProvider";
import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  LaunchControlEntry,
  type LaunchControlEntryState,
} from "./launchControlEntry";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const LaunchAbortControl = memo(function LaunchAbortControl() {
  const armState: LaunchControlEntryState = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.launch.abortControl.arm.executing")
      ? "executing"
      : state.matches("preFire.operationState.launch.abortControl.arm.stopped")
      ? "stopped"
      : "not-started"
  );

  const abortState: LaunchControlEntryState = useLaunchMachineSelector(
    (state) =>
      state.matches(
        "preFire.operationState.launch.abortControl.abort.executing"
      )
        ? "executing"
        : state.matches(
            "preFire.operationState.launch.abortControl.abort.stopped"
          )
        ? "stopped"
        : "not-started"
  );

  const { sendCommand } = useCommandSender();

  const canReturnToStandbyMode = useLaunchMachineSelector((state) =>
    state.can("RETURN_TO_STANDBY_MODE")
  );

  const returnToStandbyMode = useCallback(() => {
    sendCommand("RETURN_TO_STANDBY_MODE");
  }, [sendCommand]);

  return (
    <Panel className="flex flex-col gap-3">
      <p className="text-lg text-gray-text">Abort Control</p>
      <LaunchControlEntry
        label="ARM"
        state={armState}
        executeCommand="LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ARM"
        stopCommand="LAUNCH_MODE_ABORT_CONTROL_STOP_ARM"
      />
      <LaunchControlEntry
        label="ABORT"
        state={abortState}
        executeCommand="LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ABORT"
        stopCommand="LAUNCH_MODE_ABORT_CONTROL_STOP_ABORT"
      />

      {canReturnToStandbyMode && (
        <div className="flex justify-end mt-4">
          <Button color="green" onClick={returnToStandbyMode}>
            RETURN TO STANDBY MODE
          </Button>
        </div>
      )}
    </Panel>
  );
});
