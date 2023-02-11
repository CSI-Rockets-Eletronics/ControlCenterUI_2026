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

export default memo(function GoPoll() {
  const safetyOfficer1Yes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.safetyOfficer1.yes")
  );
  const safetyOfficer2Yes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.safetyOfficer2.yes")
  );
  const adviserYes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.adviser.yes")
  );
  const propLeadYes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.propLead.yes")
  );
  const elecLeadYes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.elecLead.yes")
  );

  const yesArray = [
    safetyOfficer1Yes,
    safetyOfficer2Yes,
    adviserYes,
    propLeadYes,
    elecLeadYes,
  ];
  const count = yesArray.filter((yes) => yes).length;
  const total = yesArray.length;

  return (
    <div>
      <p>GO/NO GO POLL</p>
      <Entry
        label="SAFETY OFFICER 1"
        yes={safetyOfficer1Yes}
        toggleCommand="GO_POLL_TOGGLE_SAFETY_OFFICER_1"
      />
      <Entry
        label="SAFETY OFFICER 2"
        yes={safetyOfficer2Yes}
        toggleCommand="GO_POLL_TOGGLE_SAFETY_OFFICER_2"
      />
      <Entry
        label="ADVISER"
        yes={adviserYes}
        toggleCommand="GO_POLL_TOGGLE_ADVISER"
      />
      <Entry
        label="PROP LEAD"
        yes={propLeadYes}
        toggleCommand="GO_POLL_TOGGLE_PROP_LEAD"
      />
      <Entry
        label="ELEC LEAD"
        yes={elecLeadYes}
        toggleCommand="GO_POLL_TOGGLE_ELEC_LEAD"
      />
      <p>
        {count}/{total} GO
      </p>
    </div>
  );
});
