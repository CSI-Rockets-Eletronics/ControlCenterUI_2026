import { z } from "zod";

const stationRelaysSchema = z.object({
  fill: z.boolean(),
  vent: z.boolean(),
  abort: z.boolean(),
  pyroCutter: z.boolean(),
  igniter: z.boolean(),
  servoValve: z.boolean(),
});

const stationStatusSchema = z.object({
  combustionPressure: z.number(), // in PSI
  oxidizerTankPressure: z.number(), // in PSI
  fillLineConnected: z.boolean(),
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

export const loadCellStateSchema = z.number();

export type LoadCellState = z.infer<typeof loadCellStateSchema>;

export const gpsStateSchema = z.object({
  /**
   * Last byte of microsecond timestamp of gps micro-controller, to detect if
   * we're receiving fresh gps data.
   */
  ts_tail: z.number(),
  /** Have a fix? */
  fix: z.boolean(),
  /** Fix quality (0, 1, 2 = Invalid, GPS, DGPS). */
  fixquality: z.number().optional(),
  /** Fixed point latitude in decimal degrees. Divide by 10000000.0 to get a double. */
  latitude_fixed: z.number().optional(),
  /** Fixed point longitude in decimal degrees. Divide by 10000000.0 to get a double. */
  longitude_fixed: z.number().optional(),
  /** Altitude in meters above MSL. */
  altitude: z.number().optional(),
});

export type GpsState = z.infer<typeof gpsStateSchema>;

export const radioGroundStateSchema = z.object({
  gps: gpsStateSchema,
});

export type RadioGroundState = z.infer<typeof radioGroundStateSchema>;
