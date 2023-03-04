import { memo, useCallback } from "react";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

export const SyncStatusPanel = memo(function SyncStatusPanel() {
  const launchActorRef = useLaunchMachineActorRef();

  const fetching = useLaunchMachineSelector(
    (state) =>
      state.matches("live.launchState.fetching") ||
      state.matches("live.stationState.fetching")
  );

  const networkError = useLaunchMachineSelector((state) =>
    state.matches("networkError")
  );

  const dismissNetworkError = useCallback(() => {
    launchActorRef.send("DISMISS_NETWORK_ERROR");
  }, [launchActorRef]);

  if (fetching) {
    return (
      <Panel color="red" className="flex items-center">
        <p className="text-gray-text">Syncing, please wait...</p>
      </Panel>
    );
  }

  if (networkError) {
    return (
      <Panel color="red" className="flex items-center gap-4">
        <p className="text-gray-text">Sync Error!</p>
        <Button onClick={dismissNetworkError} color="red">
          Retry
        </Button>
      </Panel>
    );
  }

  return null;
});
