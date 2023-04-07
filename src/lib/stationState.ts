import { z } from "zod";

const stationRelaysSchema = z.object({
  fill: z.boolean(),
  vent: z.boolean(),
  pyroValve: z.boolean(),
  pyroCutter: z.boolean(),
  igniter: z.boolean(),
  extra: z.boolean(),
});

const stationStatusSchema = z.object({
  combustionPressure: z.number(), // in PSI
  oxidizerTankPressure: z.number(), // in PSI
});

export type StationOpState =
  | "standby"
  | "keep"
  | "fill"
  | "purge"
  | "pulse"
  | "fire"
  | "abort";

export type StationRelays = z.infer<typeof stationRelaysSchema>;
export type StationStatus = z.infer<typeof stationStatusSchema>;

export type StationState = {
  opState: StationOpState;
  relays: StationRelays;
  status: StationStatus;
};

export const gpsStateSchema = z.object({
  lat: z.number(),
  long: z.number(),
  alt: z.number(),
});

export type GpsState = z.infer<typeof gpsStateSchema>;
