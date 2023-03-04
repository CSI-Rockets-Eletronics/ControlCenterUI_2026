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
]);

export type StationOpState = z.infer<typeof stationOpStateSchema>;

export const stationStateSchema = z.object({
  opState: stationOpStateSchema,
});

export type StationState = z.infer<typeof stationStateSchema>;
