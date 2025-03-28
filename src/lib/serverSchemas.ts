import { z } from "zod";

export const DEFAULT_SERVER = "https://csiwiki.me.columbia.edu/rocketsdata2";

export const DEVICES = {
  // messages
  firingStation: "FiringStation",
  // ground records
  fsState: "FsState",
  fsLoxGn2Transducers: "FsLoxGn2Transducers",
  fsInjectorTransducers: "FsInjectorTransducers",
  fsThermocouples: "FsThermocouples",
  loadCell1: "LoadCell1",
  loadCell2: "LoadCell2",
  // avionics records
  radioGround: "RadioGround",
} as const;

// ===== MISC SCHEMAS =====

export const loadCellRecordSchema = z.number();

export type LoadCellRecord = z.infer<typeof loadCellRecordSchema>;

// These mirror packets.h in the ESP32 code

// ===== GROUND PACKETS =====

const fsCustomCommandSchema = z.literal("STATE_CUSTOM");

const fsNonCustomCommandSchema = z.enum([
  "STATE_ABORT",
  "STATE_STANDBY",
  "STATE_GN2_STANDBY",
  "STATE_GN2_FILL",
  "STATE_GN2_PULSE_FILL_A",
  "STATE_GN2_PULSE_FILL_B",
  "STATE_GN2_PULSE_FILL_C",
  "STATE_FIRE",
  "STATE_FIRE_MANUAL_DOME_PILOT_OPEN",
  "STATE_FIRE_MANUAL_DOME_PILOT_CLOSE",
  "STATE_FIRE_MANUAL_IGNITER",
  "STATE_FIRE_MANUAL_RUN",
  "RECALIBRATE_TRANSDUCERS",
  "RESTART",
]);

export const fsCommandSchema = z.union([
  fsCustomCommandSchema,
  fsNonCustomCommandSchema,
]);

export type FsCommand = z.infer<typeof fsCommandSchema>;

export const fsCommandMessageSchema = z.discriminatedUnion("command", [
  z.object({
    command: fsCustomCommandSchema,
    gn2_abort: z.boolean(),
    gn2_fill: z.boolean(),
    pilot_vent: z.boolean(),
    dome_pilot_open: z.boolean(),
    run: z.boolean(),
    water_suppression: z.boolean(),
    igniter: z.boolean(),
  }),
  z.object({
    command: fsNonCustomCommandSchema,
  }),
]);

export type FsCommandMessage = z.infer<typeof fsCommandMessageSchema>;

export const fsStateSchema = z.enum([
  "CUSTOM",
  "ABORT",
  "STANDBY",
  "GN2_STANDBY",
  "GN2_FILL",
  "GN2_PULSE_FILL_A",
  "GN2_PULSE_FILL_B",
  "GN2_PULSE_FILL_C",
  "FIRE",
  "FIRE_MANUAL_DOME_PILOT_OPEN",
  "FIRE_MANUAL_DOME_PILOT_CLOSE",
  "FIRE_MANUAL_IGNITER",
  "FIRE_MANUAL_RUN",
]);

export type FsState = z.infer<typeof fsStateSchema>;

export const fsStateRecordSchema = z.object({
  ms_since_boot: z.number(),
  state: fsStateSchema,
  gn2_abort: z.boolean(),
  gn2_fill: z.boolean(),
  pilot_vent: z.boolean(),
  dome_pilot_open: z.boolean(),
  run: z.boolean(),
  water_suppression: z.boolean(),
  igniter: z.boolean(),
});

export type FsStateRecord = z.infer<typeof fsStateRecordSchema>;

export const fsLoxGn2TransducersRecordSchema = z.object({
  ts: z.number(),
  lox_upper: z.number(),
  lox_lower: z.number(),
  gn2_manifold_1: z.number(),
  gn2_manifold_2: z.number(),
  lox_upper_median: z.number(),
  lox_lower_median: z.number(),
  gn2_manifold_1_median: z.number(),
  gn2_manifold_2_median: z.number(),
});

export type FsLoxGn2TransducersRecord = z.infer<
  typeof fsLoxGn2TransducersRecordSchema
>;

export const fsInjectorTransducersRecordSchema = z.object({
  ts: z.number(),
  injector_manifold_1: z.number(),
  injector_manifold_2: z.number(),
  injector_manifold_1_median: z.number(),
  injector_manifold_2_median: z.number(),
});

export type FsInjectorTransducersRecord = z.infer<
  typeof fsInjectorTransducersRecordSchema
>;

export const fsThermocouplesRecordSchema = z.object({
  ts: z.number(),
  lox_celsius: z.number(),
  gn2_celsius: z.number(),
});

export type FsThermocouplesRecord = z.infer<typeof fsThermocouplesRecordSchema>;

// ===== AVIONICS PACKETS =====

export const radioGroundRecordSchema = z.object({
  /** Last byte of ts, to detect fresh data. */
  gps_ts_tail: z.number(),
  /** Have a fix? */
  gps_fix: z.boolean(),
  /** Fix quality (0, 1, 2 = Invalid, GPS, DGPS). */
  gps_fixquality: z.number().optional(),
  /** Number of satellites in use. */
  gps_satellites: z.number().optional(),
  /** Fixed point latitude in decimal degrees. Divide by 10000000.0 to get a double. */
  gps_latitude_fixed: z.number().optional(),
  /** Fixed point longitude in decimal degrees. Divide by 10000000.0 to get a double. */
  gps_longitude_fixed: z.number().optional(),
  /** Altitude in meters above MSL. */
  gps_altitude: z.number().optional(),
  /** Raw IMU z acceleration. Depends on the configured scale. */
  imu_az: z.number(),
});

export type RadioGroundRecord = z.infer<typeof radioGroundRecordSchema>;
