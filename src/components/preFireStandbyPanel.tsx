import { memo } from "react";

import { useLaunchMachineSelector } from "./launchMachineProvider";
import PreFillChecklist from "./preFillChecklist";
import StandbyStateSelection from "./standbyStateSelection";

export default memo(function PreFireStandbyPanel() {
  const standbyActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.standby")
  );

  return (
    <div>
      {standbyActive && <PreFillChecklist />}
      <StandbyStateSelection />
    </div>
  );
});
