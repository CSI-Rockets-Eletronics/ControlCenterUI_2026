import { memo } from "react";

import { useCommandSender } from "./commandSenderProvider";

export default memo(function SyncStatusBanner() {
  const { state, retryBlockingSync } = useCommandSender();

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
