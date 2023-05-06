import { memo, useCallback, useState } from "react";
import { twMerge } from "tailwind-merge";

import { type StationRelays } from "@/lib/stationState";

import { Button } from "./design/button";
import { CheckboxEntry } from "./design/checkboxEntry";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  field,
  pr: pendingRelays,
  spr: setPendingRelays,
}: {
  label: string;
  field: keyof StationRelays;
  pr: Partial<StationRelays>;
  spr: (pendingRelays: Partial<StationRelays>) => void;
}) {
  const checked = useLaunchMachineSelector(
    (state) => !!state.context.stationState?.relays[field]
  );

  const pendingChecked = pendingRelays?.[field] ?? checked;

  const hasPending = field in pendingRelays;

  const handleChange = useCallback(() => {
    setPendingRelays({
      ...pendingRelays,
      [field]: !pendingChecked,
    });
  }, [field, pendingChecked, pendingRelays, setPendingRelays]);

  return (
    <div
      className={twMerge(
        "rounded-lg",
        hasPending && "ring",
        hasPending && (pendingChecked ? "ring-green-border" : "ring-red-border")
      )}
    >
      <CheckboxEntry
        size="lg"
        label={label}
        checked={pendingChecked}
        disabled={false}
        onChange={handleChange}
      />
    </div>
  );
});

export const RelaysGroup = memo(function RelaysGroup() {
  const launchActorRef = useLaunchMachineActorRef();

  const [pendingRelays, setPendingRelays] = useState<Partial<StationRelays>>(
    {}
  );

  const hasPending = Object.keys(pendingRelays).length > 0;

  const setPendingRelaysDisabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "MUTATE_STATION_OP_STATE_CUSTOM",
        relays: pendingRelays,
      })
  );

  const resetPendingRelays = useCallback(() => {
    setPendingRelays({});
  }, []);

  const handleSetPendingRelays = useCallback(() => {
    launchActorRef.send({
      type: "MUTATE_STATION_OP_STATE_CUSTOM",
      relays: pendingRelays,
    });
    resetPendingRelays();
  }, [launchActorRef, pendingRelays, resetPendingRelays]);

  // for brevity
  const pr = pendingRelays;
  const spr = setPendingRelays;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {hasPending && (
        <>
          <Button color="red" disabled={false} onClick={resetPendingRelays}>
            Revert
          </Button>
          <Button
            color="green"
            disabled={setPendingRelaysDisabled}
            onClick={handleSetPendingRelays}
          >
            Set
          </Button>
        </>
      )}

      <Entry label="Fill" field="fill" pr={pr} spr={spr} />
      <Entry label="Vent" field="vent" pr={pr} spr={spr} />
      <Entry label="Pyro Valve" field="pyroValve" pr={pr} spr={spr} />
      <Entry label="Pyro Cutter" field="pyroCutter" pr={pr} spr={spr} />
      <Entry label="Igniter" field="igniter" pr={pr} spr={spr} />
    </div>
  );
});
