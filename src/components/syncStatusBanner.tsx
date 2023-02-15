import { memo } from "react";

import { useCommandSender } from "./commandSenderProvider";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const SyncStatusBanner = memo(function SyncStatusBanner() {
  const { state, retryBlockingSync } = useCommandSender();

  const inconsistentBaseline = useLaunchMachineSelector((state) =>
    state.matches("inconsistentBaseline")
  );

  if (inconsistentBaseline) {
    return <p>Error, history of sent commands is illegal!!!</p>;
  }

  if (state.matches("blockedUntilSynced")) {
    return <p>Syncing, please wait...</p>;
  }

  if (state.matches("syncError")) {
    return (
      <button className="w-fit" onClick={retryBlockingSync}>
        Sync error: click to retry...
      </button>
    );
  }

  return null;
});
