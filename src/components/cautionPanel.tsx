import { memo } from "react";
import { twMerge } from "tailwind-merge";

import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const CautionPanel = memo(function CautionPanel() {
  const isLaunch = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "launch"
  );

  const isHazardous = useLaunchMachineSelector((state) => {
    const goPollCompleted = Object.values(
      state.context.launchState.goPoll
    ).every(Boolean);
    const isOpStateAbort = state.context.stationState?.opState === "abort";
    const isOpStateStandby = state.context.stationState?.opState === "standby";

    return goPollCompleted && !isOpStateAbort && !isOpStateStandby;
  });

  const readyToFire = useLaunchMachineSelector((state) =>
    state.can({
      type: "MUTATE_STATION_OP_STATE",
      value: "fire",
    })
  );

  const isFired = useLaunchMachineSelector(
    (state) => state.context.stationState?.opState === "fire"
  );

  const message = isFired ? (
    <span className="whitespace-nowrap">🚀 Lift Off! 🚀</span>
  ) : readyToFire ? (
    <span className="whitespace-nowrap">
      Area is Hazardous.
      <br />⚡ Ready to Fire! ⚡
    </span>
  ) : isHazardous ? (
    "Area is Hazardous"
  ) : isLaunch ? (
    "Caution: Clear Area Prior to Launch"
  ) : (
    "Caution: Clear Area Prior to Fill"
  );

  const panelColor = isFired
    ? "green"
    : isHazardous || readyToFire
    ? "red"
    : "yellow";
  const messageColor = isFired
    ? "text-green-text-dim"
    : isHazardous || readyToFire
    ? "text-red-text-dim"
    : "text-yellow-text-dim";
  const pulse = isHazardous || readyToFire || isFired;

  return (
    <Panel color={panelColor} className={twMerge(pulse && "animate-pulse")}>
      <p className={twMerge("text-center", messageColor)}>{message}</p>
    </Panel>
  );
});
