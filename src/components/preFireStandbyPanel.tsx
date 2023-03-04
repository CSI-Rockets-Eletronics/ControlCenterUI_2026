import { memo, useCallback } from "react";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";
import { PreFillChecklist } from "./preFillChecklist";
import { StandbyStateSelection } from "./standbyStateSelection";

export const PreFireStandbyPanel = memo(function PreFireStandbyPanel() {
  const launchActorRef = useLaunchMachineActorRef();

  const goToLaunchModeDisabled = useLaunchMachineSelector(
    (state) => !state.can({ type: "UPDATE_ACTIVE_PANEL", value: "launch" })
  );

  const abortDisabled = useLaunchMachineSelector(
    (state) => !state.can({ type: "MUTATE_STATION_OP_STATE", value: "abort" })
  );

  const handleGoToLaunchMode = useCallback(() => {
    launchActorRef.send({ type: "UPDATE_ACTIVE_PANEL", value: "launch" });
  }, [launchActorRef]);

  const handleAbort = useCallback(() => {
    launchActorRef.send({ type: "MUTATE_STATION_OP_STATE", value: "abort" });
  }, [launchActorRef]);

  return (
    <Panel className="grid grid-rows-[1fr,auto] grid-cols-[2fr,1fr] gap-4">
      <div className="row-start-1 row-span-1 col-start-1 col-span-1">
        <PreFillChecklist />
      </div>
      <div className="row-start-1 row-span-1 col-start-2 col-span-1">
        <StandbyStateSelection />
      </div>

      <div className="flex justify-between row-start-2 row-span-1 col-start-1 col-span-2 gap-4">
        <Button color="red" disabled={abortDisabled} onClick={handleAbort}>
          ABORT
        </Button>
        <Button
          color="green"
          disabled={goToLaunchModeDisabled}
          onClick={handleGoToLaunchMode}
        >
          GO TO LAUNCH MODE
        </Button>
      </div>
    </Panel>
  );
});
