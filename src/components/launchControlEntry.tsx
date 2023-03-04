import { memo, useCallback, useMemo } from "react";
import { twMerge } from "tailwind-merge";

import { type LaunchState } from "@/lib/launchState";
import { type StationOpState } from "@/lib/stationInterface";
import { type LaunchMachineEvent } from "@/machines/launchMachine";

import { StatusButton } from "./design/statusButton";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

export type LaunchControlEntryState =
  | "not-ready"
  | "not-started"
  | "executing"
  | "stopped";

type Props = {
  label: string;
  isAbort?: boolean;
  disabled?: boolean;
} & (
  | {
      type: "opState";
      executeOpState: StationOpState;
      stopOpState: StationOpState | null;
      field?: undefined;
    }
  | {
      type: "arm";
      executeOpState?: undefined;
      stopOpState?: undefined;
      field: keyof LaunchState["armStatus"];
    }
);

export const LaunchControlEntry = memo(function LaunchControlEntry({
  label,
  isAbort = false,
  disabled = false,
  ...rest
}: Props) {
  const launchActorRef = useLaunchMachineActorRef();

  const executeEvent = useMemo<LaunchMachineEvent>(
    () =>
      rest.type === "opState"
        ? { type: "MUTATE_STATION_OP_STATE", value: rest.executeOpState }
        : { type: "UPDATE_ARM_STATUS", data: { [rest.field]: true } },
    [rest.executeOpState, rest.field, rest.type]
  );

  const stopEvent = useMemo<LaunchMachineEvent | null>(
    () =>
      rest.type === "opState"
        ? rest.stopOpState != null
          ? { type: "MUTATE_STATION_OP_STATE", value: rest.stopOpState }
          : null
        : { type: "UPDATE_ARM_STATUS", data: { [rest.field]: false } },
    [rest.stopOpState, rest.field, rest.type]
  );

  const executeDisabled = useLaunchMachineSelector(
    (state) => !state.can(executeEvent)
  );

  const stopDisabled = useLaunchMachineSelector(
    (state) => !stopEvent || !state.can(stopEvent)
  );

  const isExecuting = useLaunchMachineSelector((state) =>
    rest.type === "opState"
      ? state.context.stationState?.opState === rest.executeOpState
      : state.context.launchState.armStatus[rest.field]
  );

  const handleExecute = useCallback(() => {
    launchActorRef.send(executeEvent);
  }, [executeEvent, launchActorRef]);

  const handleStop = useCallback(() => {
    if (stopEvent) {
      launchActorRef.send(stopEvent);
    }
  }, [launchActorRef, stopEvent]);

  return (
    <div
      className={twMerge(
        "flex items-center p-4 border rounded-lg gap-4 bg-gray-el-bg border-gray-border",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <div
        className={twMerge(
          "shrink-0 w-8 h-8 mr-2 rounded-full appearance-none",
          isExecuting
            ? isAbort
              ? "bg-red-solid"
              : "bg-green-solid"
            : "bg-gray-solid"
        )}
      />
      <p className="flex-1 text-gray-text">{label}</p>
      <StatusButton
        color="green"
        disabled={!disabled && executeDisabled}
        onClick={handleExecute}
      >
        EXECUTE
      </StatusButton>
      <StatusButton
        color="red"
        disabled={!disabled && stopDisabled}
        onClick={handleStop}
      >
        STOP
      </StatusButton>
    </div>
  );
});
