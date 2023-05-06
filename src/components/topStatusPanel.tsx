import { memo } from "react";

import { useColorTheme } from "@/colorThemeProvider";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";
import { RelaysGroup } from "./relaysGroup";
import { SyncStatusPanel } from "./syncStatusPanel";

interface Props {
  openMessagesModal: () => void;
}

export const TopStatusPanel = memo(function TopStatusPanel({
  openMessagesModal,
}: Props) {
  const { isDark, toggleDark } = useColorTheme();

  const timeSinceBoot = useLaunchMachineSelector((state) =>
    (state.context.stationState?.status.timeSinceBoot ?? 0).toFixed(1)
  );

  const timeSinceCalibration = useLaunchMachineSelector((state) =>
    (state.context.stationState?.status.timeSinceCalibration ?? 0).toFixed(1)
  );

  return (
    <div className="grid grid-rows-[auto,auto] md:grid-rows-none md:grid-cols-[1fr,auto] space-y-4 md:space-y-0 md:space-x-4">
      <Panel className="flex flex-col items-stretch md:items-center md:flex-row gap-4 md:gap-6">
        <div className="flex flex-col ml-2 grow shrink-0">
          <p className="text-gray-text">FS Up: {timeSinceBoot} s</p>
          <p className="text-gray-text">Calib Up: {timeSinceCalibration} s</p>
        </div>

        <RelaysGroup />

        <div className="flex items-center gap-4">
          <Button color="gray" disabled={false} onClick={toggleDark}>
            {isDark ? "🌞" : "🌚"}
          </Button>
          <Button color="gray" disabled={false} onClick={openMessagesModal}>
            ⌨️
          </Button>
        </div>
      </Panel>
      <SyncStatusPanel />
    </div>
  );
});
