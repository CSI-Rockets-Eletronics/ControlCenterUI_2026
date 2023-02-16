import { memo, useCallback } from "react";

import { useCommandSender } from "./commandSenderProvider";
import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { PreFillChecklist } from "./preFillChecklist";
import { StandbyStateSelection } from "./standbyStateSelection";

export const PreFireStandbyPanel = memo(function PreFireStandbyPanel() {
  const standbyActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.standby")
  );

  const canGoToLaunchMode = useLaunchMachineSelector((state) =>
    state.can("GO_TO_LAUNCH_MODE")
  );

  const { sendCommand } = useCommandSender();

  const goToLaunchMode = useCallback(() => {
    sendCommand("GO_TO_LAUNCH_MODE");
  }, [sendCommand]);

  return (
    <Panel className="grid grid-rows-[1fr,auto] grid-cols-[2fr,1fr] gap-4">
      <div className="row-start-1 row-span-1 col-start-1 col-span-1">
        <PreFillChecklist />
      </div>
      <div className="row-start-1 row-span-1 col-start-2 col-span-1">
        <StandbyStateSelection />
      </div>

      <div className="flex justify-between row-start-2 row-span-1 col-start-1 col-span-2 gap-4">
        <Button
          color="red"
          disabled
          // TODO implement abort
        >
          ABORT
        </Button>
        <Button
          color="green"
          disabled={!canGoToLaunchMode}
          onClick={goToLaunchMode}
        >
          GO TO LAUNCH MODE
        </Button>
      </div>
    </Panel>
  );
});
