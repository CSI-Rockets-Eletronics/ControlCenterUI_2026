import { type FsCommand, type FsState } from "./serverSchemas";

/**
 * Returns the command that is responsible for changing to the given state.
 */
export function fsStateToCommand(state: FsState): FsCommand {
  switch (state) {
    case "CUSTOM":
      return "STATE_CUSTOM";
    case "ABORT":
      return "STATE_ABORT";
    case "STANDBY":
      return "STATE_STANDBY";
    case "GN2_STANDBY":
      return "STATE_GN2_STANDBY";
    case "GN2_FILL":
      return "STATE_GN2_FILL";
    case "GN2_PULSE_FILL_A":
      return "STATE_GN2_PULSE_FILL_A";
    case "GN2_PULSE_FILL_B":
      return "STATE_GN2_PULSE_FILL_B";
    case "GN2_PULSE_FILL_C":
      return "STATE_GN2_PULSE_FILL_C";
    case "FIRE":
      return "STATE_FIRE";
    case "FIRE_MANUAL_DOME_PILOT_OPEN":
      return "STATE_FIRE_MANUAL_DOME_PILOT_OPEN";
    case "FIRE_MANUAL_DOME_PILOT_CLOSE":
      return "STATE_FIRE_MANUAL_DOME_PILOT_CLOSE";
    case "FIRE_MANUAL_IGNITER":
      return "STATE_FIRE_MANUAL_IGNITER";
    case "FIRE_MANUAL_RUN":
      return "STATE_FIRE_MANUAL_RUN";
  }
}
