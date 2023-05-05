import { z } from "zod";

import {
  type StationOpState,
  stationOpStateSchema,
  type StationRelays,
  type StationState,
} from "./stationState";

export const STATION_STATE_SOURCE = "FiringStation";
export const LOAD_CELL_STATE_SOURCE = "IDA100";
export const GPS_STATE_SOURCE = "GpsState";

export const SET_STATION_OP_STATE_TARGET = "FiringStation";

/**
 * See generateJsonPostPayload() in
 * https://github.com/CSI-Rockets-Eletronics/GroundStation/blob/main/FiringStation/Station%20Code/ESP32MainRadioVerV8/ESP32MainRadioVerV8.ino
 */
export const remoteStationStateSchema = z.object({
  // time: z.number(),
  stateByte: z.number(),
  relayStatusByte: z.number(),
  oxTankMPSI: z.number(),
  ccMPSI: z.number(),
  timeSinceBoot: z.number(),
  timeSinceCalibration: z.number(),
});

export type RemoteStationState = z.infer<typeof remoteStationStateSchema>;

function parseStateByte(byte: number): StationOpState {
  switch (byte) {
    case 0:
      return "fire";
    case 1:
      return "fill";
    case 2:
      return "purge";
    case 3:
      return "abort";
    case 4:
      return "standby";
    case 5:
      return "keep";
    case 6:
      return "pulse-fill-A";
    case 7:
      return "pulse-fill-B";
    case 8:
      return "pulse-fill-C";
    case 20:
      return "fire-manual-igniter";
    case 21:
      return "fire-manual-valve";
    default:
      console.error("Unknown state byte", byte);
      return "standby";
  }
}

/** For dummy station. */
export function dummyToStateByte(opState: StationOpState): number {
  switch (opState) {
    case "fire":
      return 0;
    case "fill":
      return 1;
    case "purge":
      return 2;
    case "abort":
      return 3;
    case "standby":
      return 4;
    case "keep":
      return 5;
    case "pulse-fill-A":
      return 6;
    case "pulse-fill-B":
      return 7;
    case "pulse-fill-C":
      return 8;
    case "fire-manual-igniter":
      return 20;
    case "fire-manual-valve":
      return 21;
  }
}

function parseRelayStatusByte(byte: number): StationRelays {
  return {
    fill: (byte & 1) === 1,
    vent: (byte & 2) === 2,
    pyroCutter: (byte & 4) === 4,
    pyroValve: (byte & 8) === 8,
    igniter: (byte & 16) === 16,
    extra: false,
  };
}

/** For dummy station. */
export function dummyToRelayStatusByte(relays: StationRelays): number {
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
    relays: parseRelayStatusByte(remoteState.relayStatusByte),
    status: {
      // convert micros to seconds
      timeSinceBoot: remoteState.timeSinceBoot / 1e6,
      timeSinceCalibration: remoteState.timeSinceCalibration / 1e6,
      // convert pressures to mPSI to PSI
      combustionPressure: remoteState.ccMPSI / 1000,
      oxidizerTankPressure: remoteState.oxTankMPSI / 1000,
    },
  };
}

export const remoteSetStationOpStateCommandSchema = z.object({
  command: stationOpStateSchema,
});

export type RemoteSetStationOpStateCommand = z.infer<
  typeof remoteSetStationOpStateCommandSchema
>;

export function toRemoteSetStationOpStateCommand(
  opState: StationOpState
): RemoteSetStationOpStateCommand {
  return { command: opState };
}
