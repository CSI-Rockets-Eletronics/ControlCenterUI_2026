import { shallowEqual } from "@xstate/react";
import { memo } from "react";

import { BooleanDisplay } from "./design/booleanDisplay";
import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { SyncStatusPanel } from "./syncStatusPanel";

const RelaysGroup = memo(function RelaysGroup() {
  const relays = useLaunchMachineSelector(
    (state) => state.context.stationState?.relays,
    shallowEqual
  );

  return (
    <div className="flex items-center gap-4">
      <BooleanDisplay label="Fill" value={!!relays?.fill} />
      <BooleanDisplay label="Vent" value={!!relays?.vent} />
      <BooleanDisplay label="Pyro Valve" value={!!relays?.pyroValve} />
      <BooleanDisplay label="Pyro Cutter" value={!!relays?.pyroCutter} />
      <BooleanDisplay label="Igniter" value={!!relays?.igniter} />
      <BooleanDisplay label="Extra" value={!!relays?.extra} />
    </div>
  );
});

interface Props {
  openMessagesModal: () => void;
}

export const TopStatusPanel = memo(function TopStatusPanel({
  openMessagesModal,
}: Props) {
  const activePanel = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel
  );

  const currentState = {
    standby: "STANDBY",
    launch: "LAUNCH",
    recovery: "RECOVERY",
  }[activePanel];

  return (
    <div className="grid grid-cols-[1fr,auto] space-x-4">
      <Panel className="flex items-center justify-between gap-4">
        <p className="text-lg text-gray-text">Current State: {currentState}</p>
        <RelaysGroup />
        <Button color="gray" disabled={false} onClick={openMessagesModal}>
          ⌨️
        </Button>
      </Panel>
      <SyncStatusPanel />
    </div>
  );
});
