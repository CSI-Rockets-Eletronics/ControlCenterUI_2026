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

export function fsCommandToState(command: FsCommand): FsState | null {
  switch (command) {
    case "STATE_CUSTOM":
      return "CUSTOM";
    case "STATE_ABORT":
      return "ABORT";
    case "STATE_STANDBY":
      return "STANDBY";
    case "STATE_GN2_STANDBY":
      return "GN2_STANDBY";
    case "STATE_GN2_FILL":
      return "GN2_FILL";
    case "STATE_GN2_PULSE_FILL_A":
      return "GN2_PULSE_FILL_A";
    case "STATE_GN2_PULSE_FILL_B":
      return "GN2_PULSE_FILL_B";
    case "STATE_GN2_PULSE_FILL_C":
      return "GN2_PULSE_FILL_C";
    case "STATE_FIRE":
      return "FIRE";
    case "STATE_FIRE_MANUAL_DOME_PILOT_OPEN":
      return "FIRE_MANUAL_DOME_PILOT_OPEN";
    case "STATE_FIRE_MANUAL_DOME_PILOT_CLOSE":
      return "FIRE_MANUAL_DOME_PILOT_CLOSE";
    case "STATE_FIRE_MANUAL_IGNITER":
      return "FIRE_MANUAL_IGNITER";
    case "STATE_FIRE_MANUAL_RUN":
      return "FIRE_MANUAL_RUN";
    default:
      return null;
  }
}
