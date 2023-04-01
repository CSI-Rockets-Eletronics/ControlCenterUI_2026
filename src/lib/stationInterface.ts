import { z } from "zod";

import {
  type StationOpState,
  type StationRelays,
  type StationState,
} from "./stationState";

export const STATION_STATE_SOURCE = "FiringStation";
export const GPS_STATE_SOURCE = "GpsState";

export const SET_STATION_OP_STATE_TARGET = "FiringStation";

/**
 * See generateJsonPostPayload() in
 * https://github.com/CSI-Rockets-Eletronics/GroundStation/blob/main/FiringStation/Station%20Code/ESP32MainRadioVerV8/ESP32MainRadioVerV8.ino
 */
export const remoteStationStateSchema = z.object({
  // time: z.number(),
  stateByte: z.number(),
  actuatorStatusByte: z.number(),
  oxidizerTankTransducerValue: z.number(),
  combustionChamberTransducerValue: z.number(),
  // timeSinceLastCalibration: z.number(),
  // timeSinceLastStartup: z.number(),
  // opState: z.string(),
});

export type RemoteStationState = z.infer<typeof remoteStationStateSchema>;

function parseStateByte(stateByte: number): StationOpState {
  switch (stateByte) {
    case 214:
      return "fire";
    case 101:
      return "fill";
    case 138:
      return "purge";
    case 136:
      return "abort";
    case 189:
      return "standby";
    case 86:
      return "keep";
    case 99:
      return "pulse";
    default:
      console.error("Unknown state byte", stateByte);
      return "standby";
  }
}

/** For dummy station. */
export function dummyToStateByte(opState: StationOpState): number {
  switch (opState) {
    case "fire":
      return 214;
    case "fill":
      return 101;
    case "purge":
      return 138;
    case "abort":
      return 136;
    case "standby":
      return 189;
    case "keep":
      return 86;
    case "pulse":
      return 99;
  }
}

function parseActuatorStateByte(actuatorStateByte: number): StationRelays {
  return {
    fill: (actuatorStateByte & 1) === 1,
    vent: (actuatorStateByte & 2) === 2,
    pyroCutter: (actuatorStateByte & 4) === 4,
    pyroValve: (actuatorStateByte & 8) === 8,
    igniter: (actuatorStateByte & 16) === 16,
    extra: false,
  };
}

/** For dummy station. */
export function dummyToActuatorStateByte(relays: StationRelays): number {
  return (
    (relays.fill ? 1 : 0) |
    (relays.vent ? 2 : 0) |
    (relays.pyroCutter ? 4 : 0) |
    (relays.pyroValve ? 8 : 0) |
    (relays.igniter ? 16 : 0)
  );
}

/**
 * @param remoteState Should be already validated by remoteStationStateSchema.
 */
export function parseRemoteStationState(
  remoteState: RemoteStationState
): StationState {
  return {
    opState: parseStateByte(remoteState.stateByte),
    relays: parseActuatorStateByte(remoteState.actuatorStatusByte),
    status: {
      combustionPressure: remoteState.combustionChamberTransducerValue,
      oxidizerTankTemp: remoteState.oxidizerTankTransducerValue,
    },
  };
}

export const remoteSetStationOpStateCommandSchema = z.object({
  command: z.enum([
    "standby",
    "keep",
    "fill",
    "purge",
    "pulse",
    "fire",
    "abort",
  ]),
});

export type RemoteSetStationOpStateCommand = z.infer<
  typeof remoteSetStationOpStateCommandSchema
>;

export function toRemoteSetStationOpStateCommand(
  opState: StationOpState
): RemoteSetStationOpStateCommand {
  return { command: opState };
}
