import { memo, useCallback } from "react";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";
import { MapPanel } from "./mapPanel";
import { RangePermit } from "./rangePermit";
import { StatusPanel } from "./statusPanel";
import { WeatherPanel } from "./weatherPanel";

const GoToLaunchModePanel = memo(function GoToLaunchModePanel() {
  const launchActorRef = useLaunchMachineActorRef();

  const goToLaunchModeDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_ACTIVE_PANEL",
        value: "launch",
      })
  );

  const handleGoToLaunchMode = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_ACTIVE_PANEL",
      value: "launch",
    });
  }, [launchActorRef]);

  return (
    <Panel>
      <Button
        color="green"
        disabled={goToLaunchModeDisabled}
        onClick={handleGoToLaunchMode}
      >
        RETURN TO LAUNCH MODE
      </Button>
    </Panel>
  );
});

export const RecoveryPanel = memo(function RecoveryPanel() {
  return (
    <div className="grid grid-cols-[1fr,2fr,1fr] gap-4">
      <div className="grid grid-rows-[auto,auto] gap-4">
        <RangePermit />
        <WeatherPanel />
      </div>
      <MapPanel />
      <div className="grid grid-rows-[1fr,auto] gap-4">
        <StatusPanel />
        <GoToLaunchModePanel />
      </div>
    </div>
  );
});
