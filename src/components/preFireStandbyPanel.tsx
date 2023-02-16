import { memo, useCallback } from "react";

import { useCommandSender } from "./commandSenderProvider";
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
    <Panel className="grid grid-cols-[2fr,1fr] gap-4">
      <PreFillChecklist />
      <StandbyStateSelection />

      {canGoToLaunchMode && ( // TODO move
        <button onClick={goToLaunchMode}>GO TO LAUNCH MODE</button>
      )}
    </Panel>
  );
});
