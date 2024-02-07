import { z } from "zod";

import {
  type StationOpState,
  stationOpStateSchema,
  type StationRelays,
  type StationState,
} from "./stationState";

export const DEFAULT_SERVER = "https://csiwiki.me.columbia.edu/rocketsdata2";

export const DEVICES = {
  // ground station
  firingStation: "FiringStation",
  scientific: "Scientific",
  rocketScientific: "RocketScientific",
  loadCell1: "LoadCell1",
  loadCell2: "LoadCell2",
  radioGround: "RadioGround",
  // in-rocket
  gps: "GPS",
  mpu: "MPU",
  dht: "DHT",
} as const;

/**
 * See generateJsonPostPayload() in
 * https://github.com/CSI-Rockets-Eletronics/GroundStation/blob/main/FiringStation/Station%20Code/ESP32MainRadioVerV8/ESP32MainRadioVerV8.ino
 */
export const remoteStationStateSchema = z.object({
  // time: z.number(),
  stateByte: z.number(),
  relayStatusByte: z.number(),
  st1MPSI: z.number(),
  st2MPSI: z.number(),
  fillLineConnected: z.boolean().optional(),
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
    case 25:
      return "pulse-vent-A";
    case 26:
      return "pulse-vent-B";
    case 27:
      return "pulse-vent-C";
    case 30:
      return "pulse-purge-A";
    case 31:
      return "pulse-purge-B";
    case 32:
      return "pulse-purge-C";
    case 20:
      return "fire-manual-igniter";
    case 21:
      return "fire-manual-valve";
    case 40:
      return "custom";
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
    case "pulse-vent-A":
      return 25;
    case "pulse-vent-B":
      return 26;
    case "pulse-vent-C":
      return 27;
    case "pulse-purge-A":
      return 30;
    case "pulse-purge-B":
      return 31;
    case "pulse-purge-C":
      return 32;
    case "fire-manual-igniter":
      return 20;
    case "fire-manual-valve":
      return 21;
    case "custom":
      return 40;
  }
}

function parseRelayStatusByte(byte: number): StationRelays {
  return {
    fill: (byte & 1) === 1,
    vent: (byte & 2) === 2,
    abort: (byte & 4) === 4,
    pyroCutter: (byte & 8) === 8,
    igniter: (byte & 16) === 16,
    servoValve: (byte & 32) === 32,
  };
}

/** For dummy station. */
export function toRelayStatusByte(relays: StationRelays): number {
  return (
    (relays.fill ? 1 : 0) |
    (relays.vent ? 2 : 0) |
    (relays.abort ? 4 : 0) |
    (relays.pyroCutter ? 8 : 0) |
    (relays.igniter ? 16 : 0) |
    (relays.servoValve ? 32 : 0)
  );
}

/**
 * @param remoteState Should be already validated by remoteStationStateSchema.
 */
export function parseRemoteStationState(
  remoteState: RemoteStationState,
): StationState {
  return {
    opState: parseStateByte(remoteState.stateByte),
    relays: parseRelayStatusByte(remoteState.relayStatusByte),
    status: {
      // convert micros to seconds
      timeSinceBoot: remoteState.timeSinceBoot / 1e6,
      timeSinceCalibration: remoteState.timeSinceCalibration / 1e6,
      // convert pressures to mPSI to PSI
      smallTransd1Pressure: remoteState.st1MPSI / 1000,
      smallTransd2Pressure: remoteState.st2MPSI / 1000,
      fillLineConnected: remoteState.fillLineConnected ?? false,
    },
  };
}

export const remoteSetStationOpStateCommandSchema = z.object({
  command: stationOpStateSchema,
  relayStatusByte: z.number().optional(),
});

export type RemoteSetStationOpStateCommand = z.infer<
  typeof remoteSetStationOpStateCommandSchema
>;

export function toRemoteSetStationOpStateCommand(
  options:
    | { opState: Exclude<StationOpState, "custom"> }
    | {
        opState: "custom";
        relays: StationRelays;
      },
): RemoteSetStationOpStateCommand {
  return {
    command: options.opState,
    relayStatusByte:
      options.opState === "custom"
        ? toRelayStatusByte(options.relays)
        : undefined,
  };
}
