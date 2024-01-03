import { memo, useCallback, useState } from "react";
import { twMerge } from "tailwind-merge";

import { type StationRelays } from "@/lib/stationState";

import { Button } from "./design/button";
import { CheckboxEntry } from "./design/checkboxEntry";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const defaultPendingRelays: StationRelays = {
  fill: false,
  vent: false,
  pyroValve: false,
  pyroCutter: false,
  igniter: false,
};

const Entry = memo(function Entry({
  label,
  field,
  pr: pendingRelays,
  spr: setPendingRelays,
}: {
  label: string;
  field: keyof StationRelays;
  pr: StationRelays | null; // pendingRelays
  spr: (pendingRelays: StationRelays) => void; // setPendingRelays
}) {
  const checked = useLaunchMachineSelector(
    (state) => !!state.context.deviceStates.firingStation?.data.relays[field],
  );

  const hasPending = pendingRelays != null;

  const handleChange = useCallback(() => {
    if (hasPending) {
      setPendingRelays({
        ...pendingRelays,
        [field]: !pendingRelays[field],
      });
    } else {
      setPendingRelays(defaultPendingRelays);
    }
  }, [field, hasPending, pendingRelays, setPendingRelays]);

  return (
    <div
      className={twMerge(
        "rounded-lg",
        hasPending && "ring",
        hasPending &&
          (pendingRelays[field] ? "ring-green-border" : "ring-red-border"),
      )}
    >
      <CheckboxEntry
        size="lg"
        backgroundColor={
          hasPending ? (pendingRelays[field] ? "green" : "red") : "gray"
        }
        label={label}
        checked={checked}
        disabled={false}
        onChange={handleChange}
      />
    </div>
  );
});

export const RelaysGroup = memo(function RelaysGroup() {
  const launchActorRef = useLaunchMachineActorRef();

  const [pendingRelays, setPendingRelays] = useState<StationRelays | null>(
    null,
  );

  const setPendingRelaysDisabled = useLaunchMachineSelector(
    (state) =>
      pendingRelays == null ||
      !state.can({
        type: "MUTATE_STATION_OP_STATE_CUSTOM",
        relays: pendingRelays,
      }),
  );

  const cancelPendingRelays = useCallback(() => {
    setPendingRelays(null);
  }, []);

  const handleSetPendingRelays = useCallback(() => {
    if (pendingRelays == null) return;

    launchActorRef.send({
      type: "MUTATE_STATION_OP_STATE_CUSTOM",
      relays: pendingRelays,
    });
    cancelPendingRelays();
  }, [launchActorRef, pendingRelays, cancelPendingRelays]);

  // for brevity
  const pr = pendingRelays;
  const spr = setPendingRelays;

  return (
    <div className="flex items-center gap-6">
      {pendingRelays != null && (
        <div className="flex items-center gap-4">
          <Button
            color="green"
            disabled={setPendingRelaysDisabled}
            onClick={handleSetPendingRelays}
          >
            Set
          </Button>
          <Button color="red" disabled={false} onClick={cancelPendingRelays}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Entry label="Fill" field="fill" pr={pr} spr={spr} />
        <Entry label="Vent" field="vent" pr={pr} spr={spr} />
        <Entry label="Servo Valve" field="pyroValve" pr={pr} spr={spr} />
        <Entry label="Pyro Cutter" field="pyroCutter" pr={pr} spr={spr} />
        <Entry label="Igniter" field="igniter" pr={pr} spr={spr} />
      </div>
    </div>
  );
});
