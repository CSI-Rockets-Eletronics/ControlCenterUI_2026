import { memo } from "react";

import { Panel } from "./design/panel";
import {
  LaunchControlEntry,
  type LaunchControlEntryState,
} from "./launchControlEntry";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const LaunchCommandCenter = memo(function LaunchCommandCenter() {
  const keepState: LaunchControlEntryState = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.launch.commandCenter.keep.executing")
      ? "executing"
      : state.matches(
          "preFire.operationState.launch.commandCenter.keep.stopped"
        )
      ? "stopped"
      : "not-started"
  );

  const armState: LaunchControlEntryState = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.launch.commandCenter.arm.executing")
      ? "executing"
      : state.matches("preFire.operationState.launch.commandCenter.arm.stopped")
      ? "stopped"
      : "not-started"
  );

  const fireState: LaunchControlEntryState = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.launch.commandCenter.fire.notReady")
      ? "not-ready"
      : state.matches(
          "preFire.operationState.launch.commandCenter.fire.executing"
        )
      ? "executing"
      : state.matches(
          "preFire.operationState.launch.commandCenter.fire.stopped"
        )
      ? "stopped"
      : "not-started"
  );

  return (
    <Panel className="flex flex-col gap-3">
      <p className="text-lg text-gray-text">Command Center</p>
      <LaunchControlEntry
        label="KEEP"
        state={keepState}
        executeCommand="LAUNCH_MODE_COMMAND_CENTER_EXECUTE_KEEP"
        stopCommand="LAUNCH_MODE_COMMAND_CENTER_STOP_KEEP"
      />
      <LaunchControlEntry
        label="ARM"
        state={armState}
        executeCommand="LAUNCH_MODE_COMMAND_CENTER_EXECUTE_ARM"
        stopCommand="LAUNCH_MODE_COMMAND_CENTER_STOP_ARM"
      />
      <LaunchControlEntry
        label="FIRE"
        state={fireState}
        executeCommand="LAUNCH_MODE_COMMAND_CENTER_EXECUTE_FIRE"
        stopCommand="LAUNCH_MODE_COMMAND_CENTER_STOP_FIRE"
      />
    </Panel>
  );
});
