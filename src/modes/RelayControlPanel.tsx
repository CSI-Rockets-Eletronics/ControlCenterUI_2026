/* eslint-disable react-perf/jsx-no-new-function-as-prop */

import { memo, useCallback } from "react";

import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { DEVICES } from "@/lib/serverSchemas";

const RELAYS = [
  { key: "gn2_drain", label: "GN2 Drain" },
  { key: "gn2_fill", label: "GN2 Fill" },
  { key: "lox_fill", label: "LOX Fill" },
  { key: "lox_disconnect", label: "LOX Disconnect" },
  { key: "depress", label: "Depress" },
  { key: "press_pilot", label: "Press Pilot" },
  { key: "run", label: "Run" },
  { key: "igniter", label: "Igniter" },
  { key: "ereg_power", label: "EREG Power" },
] as const;

type RelayKey = (typeof RELAYS)[number]["key"];

export const RelayControlPanel = memo(function RelayControlPanel() {
  const actorRef = useLaunchMachineActorRef();

  const relayStates = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );

  const handleToggle = useCallback(
    (relayKey: RelayKey) => {
      if (!relayStates) return;

      const command = {
        command: "STATE_CUSTOM" as const,
        gn2_drain:
          relayKey === "gn2_drain"
            ? !relayStates.gn2_drain
            : relayStates.gn2_drain,
        gn2_fill:
          relayKey === "gn2_fill"
            ? !relayStates.gn2_fill
            : relayStates.gn2_fill,
        lox_fill:
          relayKey === "lox_fill"
            ? !relayStates.lox_fill
            : relayStates.lox_fill,
        lox_disconnect:
          relayKey === "lox_disconnect"
            ? !relayStates.lox_disconnect
            : relayStates.lox_disconnect,
        depress:
          relayKey === "depress" ? !relayStates.depress : relayStates.depress,
        press_pilot:
          relayKey === "press_pilot"
            ? !relayStates.press_pilot
            : relayStates.press_pilot,
        run: relayKey === "run" ? !relayStates.run : relayStates.run,
        igniter:
          relayKey === "igniter" ? !relayStates.igniter : relayStates.igniter,
        ereg_power:
          relayKey === "ereg_power"
            ? !relayStates.ereg_power
            : relayStates.ereg_power,
      };

      actorRef.send({
        type: "SEND_MANUAL_MESSAGES",
        messages: [
          {
            device: DEVICES.firingStation,
            data: command,
          },
        ],
      });
    },
    [actorRef, relayStates],
  );

  const canSend = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_MANUAL_MESSAGES", messages: [] }),
  );

  return (
    <div className="flex flex-col h-full p-2 border bg-gray-el-bg rounded-xl border-gray-border">
      <h2 className="mb-2 text-xs font-bold tracking-widest uppercase text-gray-text">
        Manual Relay Control
      </h2>

      <div className="flex-1 grid grid-cols-5 grid-rows-2 gap-2">
        {RELAYS.map((relay) => {
          const isOn = relayStates?.[relay.key] ?? false;
          const canToggle = canSend && relayStates !== undefined;

          return (
            <button
              key={relay.key}
              onClick={() => handleToggle(relay.key)}
              disabled={!canToggle}
              className={[
                "rounded-xl border-2 transition-all flex flex-col items-center justify-center p-1.5",
                isOn
                  ? "bg-green-bg border-green-solid text-green-text"
                  : "bg-gray-bg-2 border-gray-border text-gray-text",
                !canToggle
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:opacity-80",
              ].join(" ")}
            >
              <div
                className={`w-3 h-3 rounded-full mb-1 ${
                  isOn ? "bg-green-solid animate-pulse" : "bg-red-solid"
                }`}
              />

              <div className="text-xs font-bold leading-tight text-center">
                {relay.label}
              </div>

              <div className="text-xs font-semibold opacity-70">
                {isOn ? "OPEN" : "CLOSED"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
