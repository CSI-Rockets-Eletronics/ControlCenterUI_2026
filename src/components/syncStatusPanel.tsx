import { memo } from "react";

import { useCommandSender } from "./commandSenderProvider";
import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const SyncStatusPanel = memo(function SyncStatusPanel() {
  const { state, retryBlockingSync } = useCommandSender();

  const inconsistentBaseline = useLaunchMachineSelector((state) =>
    state.matches("inconsistentBaseline")
  );

  if (inconsistentBaseline) {
    return (
      <Panel color="red" className="flex items-center">
        <p className="text-gray-text">
          Error, history of sent commands is illegal!!!
        </p>
      </Panel>
    );
  }

  if (state.matches("blockedUntilSynced")) {
    return (
      <Panel color="red" className="flex items-center">
        <p className="text-gray-text">Syncing, please wait...</p>
      </Panel>
    );
  }

  if (state.matches("syncError")) {
    return (
      <Panel color="red" className="flex items-center gap-4">
        <p className="text-gray-text">Sync Error!</p>
        <Button onClick={retryBlockingSync} color="red">
          Retry
        </Button>
      </Panel>
    );
  }

  return null;
});
