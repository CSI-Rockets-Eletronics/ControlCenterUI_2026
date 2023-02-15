import { memo, useCallback } from "react";

import { useCommandSender } from "./commandSenderProvider";
import { LaunchAbortControl } from "./launchAbortControl";
import { LaunchCommandCenter } from "./launchCommandCenter";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const PreFireLaunchPanel = memo(function PreFireLaunchPanel() {
  const canGoToRecoveryMode = useLaunchMachineSelector((state) =>
    state.can("GO_TO_RECOVERY_MODE")
  );

  const { sendCommand } = useCommandSender();

  const goToRecoveryMode = useCallback(() => {
    sendCommand("GO_TO_RECOVERY_MODE");
  }, [sendCommand]);

  return (
    <div>
      <LaunchCommandCenter />
      <LaunchAbortControl />

      {canGoToRecoveryMode && (
        <div>
          <p>Lift Off!!!</p>
          <button onClick={goToRecoveryMode}>GO TO RECOVERY MODE</button>
        </div>
      )}
    </div>
  );
});
