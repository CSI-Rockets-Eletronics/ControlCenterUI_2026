import { z } from "zod";

const stationOpStateSchema = z.enum([
  "standby",
  "keep",
  "fill",
  "purge",
  "pulse",
  "fire",
  "abort",
]);

const stationRelaysSchema = z.object({
  fill: z.boolean(),
  vent: z.boolean(),
  pyroValve: z.boolean(),
  pyroCutter: z.boolean(),
  igniter: z.boolean(),
  extra: z.boolean(),
});

const stationStatusSchema = z.object({
  combustionPressure: z.number(),
  oxidizerTankTemp: z.number(),
});

export const stationStateSchema = z.object({
  opState: stationOpStateSchema,
  relays: stationRelaysSchema,
  status: stationStatusSchema,
});

export type StationOpState = z.infer<typeof stationOpStateSchema>;
export type StationRelays = z.infer<typeof stationRelaysSchema>;
export type StationStatus = z.infer<typeof stationStatusSchema>;

export type StationState = z.infer<typeof stationStateSchema>;

export const gpsStateSchema = z.object({
  lat: z.number(),
  long: z.number(),
  alt: z.number(),
});

export type GpsState = z.infer<typeof gpsStateSchema>;
