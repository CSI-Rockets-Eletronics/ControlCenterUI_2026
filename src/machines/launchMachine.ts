import { createMachine } from "xstate";

export default createMachine(
  {
    tsTypes: {} as import("./launchMachine.typegen").Typegen0,
    predictableActionArguments: true,
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
                          fillRelay: { initial: "no", states: { no: {}, yes: {} } },
                          abortRelay: { initial: "no", states: { no: {}, yes: {} } },
                          fireRelay: { initial: "no", states: { no: {}, yes: {} } },
                          fillSolenoid: { initial: "no", states: { no: {}, yes: {} } },
                          abortSolenoid: { initial: "no", states: { no: {}, yes: {} } },
                          wetGround: { initial: "no", states: { no: {}, yes: {} } },
                          openTank: { initial: "no", states: { no: {}, yes: {} } },
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
              safetyOfficer1: { initial: "no", states: { no: {}, yes: {} } },
              safetyOfficer2: { initial: "no", states: { no: {}, yes: {} } },
              adviser: { initial: "no", states: { no: {}, yes: {} } },
              propLead: { initial: "no", states: { no: {}, yes: {} } },
              elecLead: { initial: "no", states: { no: {}, yes: {} } },
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
                  safetyOfficer1: { initial: "no", states: { no: {}, yes: {} } },
                  safetyOfficer2: { initial: "no", states: { no: {}, yes: {} } },
                  adviser: { initial: "no", states: { no: {}, yes: {} } },
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
