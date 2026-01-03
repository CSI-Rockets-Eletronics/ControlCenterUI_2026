import { memo, useCallback } from "react";

import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";
import { StandbyStateSelection } from "./standbyStateSelection";

export const PreFireStandbyPanel = memo(function PreFireStandbyPanel() {
  const launchActorRef = useLaunchMachineActorRef();

  const goToLaunchModeDisabled = useLaunchMachineSelector(
    (state) => !state.can({ type: "UPDATE_ACTIVE_PANEL", value: "launch" }),
  );

  const abortDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "SEND_FS_COMMAND",
        value: { command: "STATE_ABORT" },
      }),
  );

  const handleGoToLaunchMode = useCallback(() => {
    launchActorRef.send({ type: "UPDATE_ACTIVE_PANEL", value: "launch" });
  }, [launchActorRef]);

  const handleAbort = useCallback(() => {
    launchActorRef.send({
      type: "SEND_FS_COMMAND",
      value: { command: "STATE_ABORT" },
    });
  }, [launchActorRef]);

  return (
    <Panel className="md:min-h-0 grid grid-rows-[minmax(0,1fr),auto] gap-4">
      <StandbyStateSelection />
      <div className="flex justify-between gap-2">
        <button
          className="px-3 py-2 font-bold rounded bg-red-solid hover:bg-red-solid-hover active:bg-red-solid-active text-gray-text disabled:opacity-50"
          disabled={abortDisabled}
          onClick={handleAbort}
        >
          ABORT
        </button>
        <button
          className="px-3 py-2 font-bold rounded bg-green-fallback-8 hover:bg-green-fallback-9 active:bg-green-fallback-10 text-gray-text disabled:opacity-50"
          disabled={goToLaunchModeDisabled}
          onClick={handleGoToLaunchMode}
        >
          LAUNCH MODE
        </button>
      </div>
    </Panel>
  );
});
