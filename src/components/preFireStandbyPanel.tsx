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
    <Panel>
      {standbyActive && <PreFillChecklist />}
      <StandbyStateSelection />

      {canGoToLaunchMode && (
        <button onClick={goToLaunchMode}>GO TO LAUNCH MODE</button>
      )}
    </Panel>
  );
});
