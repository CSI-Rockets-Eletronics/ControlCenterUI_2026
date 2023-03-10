import { z } from "zod";

export const STATION_STATE_SOURCE = "STATION_STATE";
export const SET_STATION_OP_STATE_TARGET = "SET_STATION_OP_STATE";

export const STATION_FIRE_OP_STATE = "fire";

export const stationOpStateSchema = z.enum([
  "standby",
  "keep",
  "fill",
  "purge",
  "pulse",
  STATION_FIRE_OP_STATE,
  "abort",
]);

export const stationRelaysSchema = z.object({
  fill: z.boolean(),
  vent: z.boolean(),
  pyroValve: z.boolean(),
  pyroCutter: z.boolean(),
  igniter: z.boolean(),
  extra: z.boolean(),
});

export const stationStatusSchema = z.object({
  battery: z.boolean(),
  fillTank: z.boolean(),
  igniters: z.boolean(),
  mechPower: z.boolean(),
});

export const stationTankSchema = z.object({
  combustionPressure: z.number(),
  oxidizerTankTemp: z.number(),
});

export const stationGpsSchema = z.object({
  lat: z.number(),
  long: z.number(),
  alt: z.number(),
});

export const stationStateSchema = z.object({
  opState: stationOpStateSchema,
  relays: stationRelaysSchema,
  status: stationStatusSchema,
  tank: stationTankSchema,
  gps: stationGpsSchema,
});

export type StationOpState = z.infer<typeof stationOpStateSchema>;
export type StationRelays = z.infer<typeof stationRelaysSchema>;
export type StationStatus = z.infer<typeof stationStatusSchema>;
export type StationTank = z.infer<typeof stationTankSchema>;
export type StationGps = z.infer<typeof stationGpsSchema>;

export type StationState = z.infer<typeof stationStateSchema>;
