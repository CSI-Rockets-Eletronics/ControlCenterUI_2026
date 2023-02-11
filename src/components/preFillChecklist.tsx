import { memo, useCallback } from "react";

import { type Command } from "@/lib/command";

import { useCommandSender } from "./commandSenderProvider";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  yes,
  toggleCommand,
}: {
  label: string;
  yes: boolean;
  toggleCommand: Command;
}) {
  const { sendCommand } = useCommandSender();

  const handleChange = useCallback(() => {
    sendCommand(toggleCommand);
  }, [sendCommand, toggleCommand]);

  return (
    <div>
      <label>
        {label}: <input type="checkbox" checked={yes} onChange={handleChange} />
      </label>
    </div>
  );
});

export default memo(function PreFillChecklist() {
  const fillRelayYes = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.fillRelay.yes"
    )
  );
  const abortRelayYes = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.abortRelay.yes"
    )
  );
  const fireRelay = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.fireRelay.yes"
    )
  );
  const fillSolenoidYes = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.fillSolenoid.yes"
    )
  );
  const abortSolenoidYes = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.abortSolenoid.yes"
    )
  );
  const wetGroundYes = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.wetGround.yes"
    )
  );
  const openTankYes = useLaunchMachineSelector((state) =>
    state.matches(
      "preFire.operationState.standby.standby.preFillChecklist.openTank.yes"
    )
  );

  return (
    <div>
      <p>Pre-Fill Checklist</p>
      <Entry
        label="FILL RELAY"
        yes={fillRelayYes}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_FILL_RELAY"
      />
      <Entry
        label="ABORT RELAY"
        yes={abortRelayYes}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_ABORT_RELAY"
      />
      <Entry
        label="FIRE RELAY"
        yes={fireRelay}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_FIRE_RELAY"
      />
      <Entry
        label="FILL SOLENOID"
        yes={fillSolenoidYes}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_FILL_SOLENOID"
      />
      <Entry
        label="ABORT SOLENOID"
        yes={abortSolenoidYes}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_ABORT_SOLENOID"
      />
      <Entry
        label="WET GROUND"
        yes={wetGroundYes}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_WET_GROUND"
      />
      <Entry
        label="OPEN TANK"
        yes={openTankYes}
        toggleCommand="PRE_FILL_CHECKLIST_TOGGLE_OPEN_TANK"
      />
    </div>
  );
});
