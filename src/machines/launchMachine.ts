import { createMachine } from "xstate";

type Events =
  // pre-fire go poll
  | { type: "GO_POLL_TOGGLE_SAFETY_OFFICER_1" }
  | { type: "GO_POLL_TOGGLE_SAFETY_OFFICER_2" }
  | { type: "GO_POLL_TOGGLE_ADVISER" }
  | { type: "GO_POLL_TOGGLE_PROP_LEAD" }
  | { type: "GO_POLL_TOGGLE_ELEC_LEAD" }
  // standby pre-fill checklist
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_FILL_RELAY" }
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_ABORT_RELAY" }
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_FIRE_RELAY" }
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_FILL_SOLENOID" }
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_ABORT_SOLENOID" }
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_WET_GROUND" }
  | { type: "PRE_FILL_CHECKLIST_TOGGLE_OPEN_TANK" }
  // standby state selection
  | { type: "STANDBY_STATE_ACTIVATE_STANDBY" }
  | { type: "STANDBY_STATE_ACTIVATE_KEEP" }
  | { type: "STANDBY_STATE_ACTIVATE_FILL" }
  | { type: "STANDBY_STATE_ACTIVATE_PURGE" }
  | { type: "STANDBY_STATE_ACTIVATE_PULSE" }
  // standby go to launch mode
  | { type: "GO_TO_LAUNCH_MODE" }
  // launch mode command center
  | { type: "LAUNCH_MODE_COMMAND_CENTER_EXECUTE_KEEP" }
  | { type: "LAUNCH_MODE_COMMAND_CENTER_STOP_KEEP" }
  | { type: "LAUNCH_MODE_COMMAND_CENTER_EXECUTE_ARM" }
  | { type: "LAUNCH_MODE_COMMAND_CENTER_STOP_ARM" }
  | { type: "LAUNCH_MODE_COMMAND_CENTER_EXECUTE_FIRE" }
  | { type: "LAUNCH_MODE_COMMAND_CENTER_STOP_FIRE" }
  // launch mode abort control
  | { type: "LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ARM" }
  | { type: "LAUNCH_MODE_ABORT_CONTROL_STOP_ARM" }
  | { type: "LAUNCH_MODE_ABORT_CONTROL_EXECUTE_ABORT" }
  | { type: "LAUNCH_MODE_ABORT_CONTROL_STOP_ABORT" }
  // recovery visual contact confirmation
  | { type: "CONFIRM_VISUAL_CONTACT" }
  // recovery range permit
  | { type: "RANGE_PERMIT_TOGGLE_SAFETY_OFFICER_1" }
  | { type: "RANGE_PERMIT_TOGGLE_SAFETY_OFFICER_2" }
  | { type: "RANGE_PERMIT_TOGGLE_ADVISER" };

export default createMachine(
  {
    tsTypes: {} as import("./launchMachine.typegen").Typegen0,
    predictableActionArguments: true,
    schema: {
      events: {} as Events,
    },
    id: "launch",
    initial: "preFire",
    states: {
      preFire: {
        type: "parallel",
        states: {
          operationState: {
            initial: "standby",
            states: {
              standby: {
                initial: "standby",
                states: {
                  standby: {
                    type: "parallel",
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
                    },
                  },
                  keep: {},
                  fill: {},
                  purge: {},
                  pulse: {},
                },
              },
              launch: {
                type: "parallel",
                states: {
                  commandCenter: {
                    type: "parallel",
                    states: {
                      keep: { initial: "notStarted", states: { notStarted: {}, executing: {}, stopped: {} } },
                      arm: { initial: "notStarted", states: { notStarted: {}, executing: {}, stopped: {} } },
                    },
                  },
                  abortControl: {
                    type: "parallel",
                    states: {
                      arm: { initial: "notStarted", states: { notStarted: {}, executing: {}, stopped: {} } },
                      abort: { initial: "notStarted", states: { notStarted: {}, executing: {}, stopped: {} } },
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
          pendingVisualContact: {},
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
    actions: {},
    guards: {},
  }
);
