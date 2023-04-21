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
    <div className="flex flex-wrap items-center gap-4">
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
    standby: "Standby",
    launch: "Launch",
    recovery: "Recovery",
  }[activePanel];

  const timeSinceBoot = useLaunchMachineSelector((state) =>
    (state.context.stationState?.status.timeSinceBoot ?? 0).toFixed(1)
  );

  const timeSinceCalibration = useLaunchMachineSelector((state) =>
    (state.context.stationState?.status.timeSinceCalibration ?? 0).toFixed(1)
  );

  return (
    <div className="grid grid-rows-[auto,auto] md:grid-rows-none md:grid-cols-[1fr,auto] space-y-4 md:space-y-0 md:space-x-4">
      <Panel className="flex flex-col items-stretch md:items-center md:flex-row gap-4 md:gap-6">
        <p className="text-lg text-gray-text">State: {currentState}</p>
        <div className="flex flex-col ml-2 grow">
          <p className="text-gray-text">FS Uptime: {timeSinceBoot} s</p>
          <p className="text-gray-text">
            Calib Uptime: {timeSinceCalibration} s
          </p>
        </div>
        <RelaysGroup />
        <Button color="gray" disabled={false} onClick={openMessagesModal}>
          ⌨️
        </Button>
      </Panel>
      <SyncStatusPanel />
    </div>
  );
});
