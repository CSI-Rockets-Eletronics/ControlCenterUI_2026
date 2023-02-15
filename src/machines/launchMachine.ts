import { createMachine, State } from "xstate";

import { Command } from "@/lib/command";

const preFillChecklistIsComplete = (state: State<unknown, { type: "" }>) =>
  ["fillRelay", "abortRelay", "fireRelay", "fillSolenoid", "abortSolenoid", "wetGround", "openTank"].every((item) =>
    state.matches(`preFire.operationState.standby.standby.preFillChecklist.${item}.yes`)
  );

const readyToFire = (state: State<unknown, { type: "" }>) => {
  const gollPollIsComplete = ["safetyOfficer1", "safetyOfficer2", "adviser", "propLead", "elecLead"].every((item) =>
    state.matches(`preFire.goPoll.${item}.yes`)
  );
  const allArmed = ["commandCenter.arm", "abortControl.arm"].every((item) =>
    state.matches(`preFire.operationState.launch.${item}.executing`)
  );
  return gollPollIsComplete && allArmed;
};

const rangePermitIsComplete = (state: State<unknown, { type: "" }>) =>
  ["safetyOfficer1", "safetyOfficer2", "adviser"].every((item) =>
    state.matches(`recovery.landed.rangePermit.${item}.yes`)
  );

type Events = { type: Command } | { type: "RESET" } | { type: "REPORT_INCONSISTENT_BASELINE" };

export default createMachine(
  {
    tsTypes: {} as import("./launchMachine.typegen").Typegen0,
    predictableActionArguments: true,
    schema: {
      events: {} as Events,
    },
    id: "launch",
    on: {
      RESET: "resetMachine",
      REPORT_INCONSISTENT_BASELINE: "inconsistentBaseline",
    },
    initial: "resetMachine",
    states: {
      resetMachine: {
        always: "preFire",
      },
      inconsistentBaseline: {
        type: "final",
      },
      preFire: {
        type: "parallel",
        states: {
          operationState: {
            initial: "standby",
            states: {
              standby: {
                on: {
                  GO_TO_LAUNCH_MODE: "launch",
                  STANDBY_STATE_ACTIVATE_STANDBY: ".standby",
                  STANDBY_STATE_ACTIVATE_KEEP: ".keep",
                  STANDBY_STATE_ACTIVATE_FILL: ".fill",
                  STANDBY_STATE_ACTIVATE_PURGE: ".purge",
                  STANDBY_STATE_ACTIVATE_PULSE: ".pulse",
                },
                initial: "standby",
                states: {
                  standby: {
                    type: "parallel",
                    on: { STANDBY_STATE_ACTIVATE_STANDBY: undefined },
                    states: {
                      preFillChecklist: {
                        type: "parallel",
                        states: {
                          fillRelay: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_FILL_RELAY: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_FILL_RELAY: "no" } },
                            },
                          },
                          abortRelay: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_ABORT_RELAY: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_ABORT_RELAY: "no" } },
                            },
                          },
                          fireRelay: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_FIRE_RELAY: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_FIRE_RELAY: "no" } },
                            },
                          },
                          fillSolenoid: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_FILL_SOLENOID: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_FILL_SOLENOID: "no" } },
                            },
                          },
                          abortSolenoid: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_ABORT_SOLENOID: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_ABORT_SOLENOID: "no" } },
                            },
                          },
                          wetGround: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_WET_GROUND: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_WET_GROUND: "no" } },
                            },
                          },
                          openTank: {
                            initial: "no",
                            states: {
                              no: { on: { PRE_FILL_CHECKLIST_TOGGLE_OPEN_TANK: "yes" } },
                              yes: { on: { PRE_FILL_CHECKLIST_TOGGLE_OPEN_TANK: "no" } },
                            },
                          },
                        },
                      },
                      preFillChecklistComplete: {
                        initial: "no",
                        states: {
                          no: {
                            always: { target: "yes", cond: "preFillChecklistIsComplete" },
                            on: {
                              GO_TO_LAUNCH_MODE: undefined,
                              STANDBY_STATE_ACTIVATE_STANDBY: undefined,
                              STANDBY_STATE_ACTIVATE_KEEP: undefined,
                              STANDBY_STATE_ACTIVATE_FILL: undefined,
                              STANDBY_STATE_ACTIVATE_PURGE: undefined,
                              STANDBY_STATE_ACTIVATE_PULSE: undefined,
                            },
                          },
                          yes: {
                            always: { target: "no", cond: "preFillChecklistIsNotComplete" },
                          },
                        },
                      },
                    },
                  },
                  keep: { on: { STANDBY_STATE_ACTIVATE_KEEP: undefined } },
                  fill: { on: { STANDBY_STATE_ACTIVATE_FILL: undefined } },
                  purge: { on: { STANDBY_STATE_ACTIVATE_PURGE: undefined } },
                  pulse: { on: { STANDBY_STATE_ACTIVATE_PULSE: undefined } },
                },
              },
              launch: {
                type: "parallel",
                states: {
                  commandCenter: {
                    type: "parallel",
                    states: {
                      keep: {
                        initial: "notStarted",
                        states: {
                          notStarted: { on: { LAUNCH_MODE_COMMAND_CENTER_EXECUTE_KEEP: "executing" } },
                          executing: { on: { LAUNCH_MODE_COMMAND_CENTER_STOP_KEEP: "stopped" } },
                          stopped: { on: { LAUNCH_MODE_COMMAND_CENTER_EXECUTE_KEEP: "executing" } },
                        },
                      },
                      arm: {
                        initial: "notStarted",
                        states: {
                          notStarted: { on: { LAUNCH_MODE_COMMAND_CENTER_EXECUTE_ARM: "executing" } },
                          executing: { on: { LAUNCH_MODE_COMMAND_CENTER_STOP_ARM: "stopped" } },
                          stopped: { on: { LAUNCH_MODE_COMMAND_CENTER_EXECUTE_ARM: "executing" } },
                        },
                      },
                      fire: {
                        initial: "notReady",
                        states: {
                          notReady: { always: { target: "notStarted", cond: "readyToFire" } },
                          notStarted: {
                            always: { target: "notReady", cond: "notReadyToFire" },
                            on: { LAUNCH_MODE_COMMAND_CENTER_EXECUTE_FIRE: "executing" },
                          },
                          executing: {
                            on: {
                              LAUNCH_MODE_COMMAND_CENTER_STOP_FIRE: "stopped",
                              GO_TO_RECOVERY_MODE: "#launch.recovery",
                            },
                          },
                          stopped: {
                            always: { target: "notReady", cond: "notReadyToFire" },
                            on: { LAUNCH_MODE_COMMAND_CENTER_EXECUTE_FIRE: "executing" },
                          },
                        },
                      },
                    },
                  },
                  abortControl: {
                    type: "parallel",
                    states: {
                      arm: {
                        initial: "notStarted",
                        states: {
                          notStarted: { on: { LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ARM: "executing" } },
                          executing: { on: { LAUNCH_MODE_ABORT_CONTROL_STOP_ARM: "stopped" } },
                          stopped: { on: { LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ARM: "executing" } },
                        },
                      },
                      abort: {
                        initial: "notStarted",
                        states: {
                          notStarted: { on: { LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ABORT: "executing" } },
                          executing: { on: { LAUNCH_MODE_ABORT_CONTROL_STOP_ABORT: "stopped" } },
                          stopped: { on: { LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ABORT: "executing" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          goPoll: {
            type: "parallel",
            states: {
              safetyOfficer1: {
                initial: "no",
                states: {
                  no: { on: { GO_POLL_TOGGLE_SAFETY_OFFICER_1: "yes" } },
                  yes: { on: { GO_POLL_TOGGLE_SAFETY_OFFICER_1: "no" } },
                },
              },
              safetyOfficer2: {
                initial: "no",
                states: {
                  no: { on: { GO_POLL_TOGGLE_SAFETY_OFFICER_2: "yes" } },
                  yes: { on: { GO_POLL_TOGGLE_SAFETY_OFFICER_2: "no" } },
                },
              },
              adviser: {
                initial: "no",
                states: {
                  no: { on: { GO_POLL_TOGGLE_ADVISER: "yes" } },
                  yes: { on: { GO_POLL_TOGGLE_ADVISER: "no" } },
                },
              },
              propLead: {
                initial: "no",
                states: {
                  no: { on: { GO_POLL_TOGGLE_PROP_LEAD: "yes" } },
                  yes: { on: { GO_POLL_TOGGLE_PROP_LEAD: "no" } },
                },
              },
              elecLead: {
                initial: "no",
                states: {
                  no: { on: { GO_POLL_TOGGLE_ELEC_LEAD: "yes" } },
                  yes: { on: { GO_POLL_TOGGLE_ELEC_LEAD: "no" } },
                },
              },
            },
          },
        },
      },
      recovery: {
        initial: "pendingVisualContact",
        states: {
          pendingVisualContact: { on: { CONFIRM_VISUAL_CONTACT: "inFlight" } },
          inFlight: {},
          landed: {
            type: "parallel",
            states: {
              rangePermit: {
                type: "parallel",
                states: {
                  safetyOfficer1: {
                    initial: "no",
                    states: {
                      no: { on: { RANGE_PERMIT_TOGGLE_SAFETY_OFFICER_1: "yes" } },
                      yes: { on: { RANGE_PERMIT_TOGGLE_SAFETY_OFFICER_1: "no" } },
                    },
                  },
                  safetyOfficer2: {
                    initial: "no",
                    states: {
                      no: { on: { RANGE_PERMIT_TOGGLE_SAFETY_OFFICER_2: "yes" } },
                      yes: { on: { RANGE_PERMIT_TOGGLE_SAFETY_OFFICER_2: "no" } },
                    },
                  },
                  adviser: {
                    initial: "no",
                    states: {
                      no: { on: { RANGE_PERMIT_TOGGLE_ADVISER: "yes" } },
                      yes: { on: { RANGE_PERMIT_TOGGLE_ADVISER: "no" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    guards: {
      preFillChecklistIsComplete: (_, __, { state }) => preFillChecklistIsComplete(state),
      preFillChecklistIsNotComplete: (_, __, { state }) => !preFillChecklistIsComplete(state),
      readyToFire: (_, __, { state }) => readyToFire(state),
      notReadyToFire: (_, __, { state }) => !readyToFire(state),
      // rangePermitIsComplete: (_, __, { state }) => rangePermitIsComplete(state),
    },
  }
);
