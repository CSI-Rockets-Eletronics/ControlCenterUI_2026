import { z } from "zod";

const stationRelaysSchema = z.object({
  fill: z.boolean(),
  vent: z.boolean(),
  pyroValve: z.boolean(),
  pyroCutter: z.boolean(),
  igniter: z.boolean(),
});

const stationStatusSchema = z.object({
  combustionPressure: z.number(), // in PSI
  oxidizerTankPressure: z.number(), // in PSI
  timeSinceBoot: z.number(), // in seconds
  timeSinceCalibration: z.number(), // in seconds
});

export const stationOpStateSchema = z.enum([
  "standby",
  "keep",
  "fill",
  "purge",
  "pulse-fill-A",
  "pulse-fill-B",
  "pulse-fill-C",
  "pulse-vent-A",
  "pulse-vent-B",
  "pulse-vent-C",
  "pulse-purge-A",
  "pulse-purge-B",
  "pulse-purge-C",
  "fire",
  "fire-manual-igniter",
  "fire-manual-valve",
  "abort",
  "custom",
]);

export type StationOpState = z.infer<typeof stationOpStateSchema>;

export type StationRelays = z.infer<typeof stationRelaysSchema>;
export type StationStatus = z.infer<typeof stationStatusSchema>;

export type StationState = {
  opState: StationOpState;
  relays: StationRelays;
  status: StationStatus;
};

export const loadCellStateSchema = z.object({
  data: z.number(),
});

export type LoadCellState = z.infer<typeof loadCellStateSchema>;

export const gpsStateSchema = z.object({
  lat: z.number(),
  long: z.number(),
  alt: z.number(),
});

export type GpsState = z.infer<typeof gpsStateSchema>;
