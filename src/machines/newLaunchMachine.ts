import { assign, createMachine } from "xstate";

import { Api, Record as ApiRecord } from "@/lib/api";
import {
  ActivePanel,
  initialLaunchState,
  LAUNCH_STATE_SOURCE,
  LaunchState,
  launchStateSchema,
} from "@/lib/launchState";
import {
  SET_STATION_OP_STATE_TARGET,
  STATION_FIRE_OP_STATE,
  STATION_STATE_SOURCE,
  StationOpState,
  StationState,
  stationStateSchema,
} from "@/lib/stationInterface";

const LAUNCH_STATE_FETCH_INTERVAL = 1000;
const STATION_STATE_FETCH_INTERVAL = 1000;

const STATION_RECORDS_RETENTION_MS = 10 * 1000;

function checklistIsComplete(checklist: Record<string, boolean>) {
  return Object.values(checklist).every(Boolean);
}

function armStatusIsComplete(armStatus: Record<string, boolean>) {
  return Object.values(armStatus).every(Boolean);
}

type Events =
  | { type: "DISMISS_NETWORK_ERROR" }
  | {
      type: "UPDATE_ACTIVE_PANEL";
      value: ActivePanel;
    }
  | {
      type: "UPDATE_PRE_FILL_CHECKLIST";
      data: Partial<LaunchState["preFillChecklist"]>;
    }
  | {
      type: "UPDATE_GO_POLL";
      data: Partial<LaunchState["goPoll"]>;
    }
  | {
      type: "UPDATE_ARM_STATUS";
      data: Partial<LaunchState["armStatus"]>;
    }
  | {
      type: "UPDATE_RANGE_PERMIT";
      data: Partial<LaunchState["rangePermit"]>;
    }
  | {
      type: "UPDATE_VISUAL_CONTACT_CONFIRMED";
      value: boolean;
    }
  | {
      type: "MUTATE_STATION_OP_STATE";
      opState: StationOpState;
    };

export async function createLaunchMachine(api: Api) {
  return createMachine(
    {
      tsTypes: {} as import("./newLaunchMachine.typegen").Typegen0,
      predictableActionArguments: true,
      schema: {
        events: {} as Events,
        context: {} as {
          launchState: LaunchState;
          pendingLaunchState: LaunchState | null;
          stationState: StationState | null;
          stationRecords: ApiRecord<StationState>[];
        },
        services: {} as {
          fetchLaunchState: { data: LaunchState };
          mutateLaunchState: { data: LaunchState };
          fetchStationRecord: { data: ApiRecord<StationState> | null };
          mutateStationOpState: { data: void };
        },
      },
      id: "launch",
      context: {
        launchState: initialLaunchState,
        pendingLaunchState: null,
        stationState: null,
        stationRecords: [],
      },
      initial: "live",
      states: {
        live: {
          type: "parallel",
          states: {
            launchState: {
              always: { cond: "hasPendingLaunchState", target: ".mutating" },
              initial: "fetching",
              states: {
                idle: {
                  after: { [LAUNCH_STATE_FETCH_INTERVAL]: "fetching" },
                },
                fetching: {
                  invoke: {
                    src: "fetchLaunchState",
                    onDone: {
                      target: "idle",
                      actions: "setLaunchState",
                    },
                    onError: "#launch.networkError",
                  },
                },
                mutating: {
                  invoke: {
                    src: "mutateLaunchState",
                    onDone: {
                      target: "idle",
                      actions: "setLaunchState",
                    },
                    onError: "#launch.networkError",
                  },
                  exit: "clearPendingLaunchState",
                },
              },
            },
            stationState: {
              on: {
                MUTATE_STATION_OP_STATE: {
                  target: ".mutatingOpState",
                  cond: "canMutateOpState",
                },
              },
              initial: "fetching",
              states: {
                idle: {
                  after: { [STATION_STATE_FETCH_INTERVAL]: "fetching" },
                },
                fetching: {
                  invoke: {
                    src: "fetchStationRecord",
                    onDone: {
                      target: "idle",
                      actions: "setStationState",
                    },
                    onError: "#launch.networkError",
                  },
                },
                mutatingOpState: {
                  invoke: {
                    src: "mutateStationOpState",
                    onDone: "fetching",
                    onError: "#launch.networkError",
                  },
                },
              },
            },
          },
        },
        networkError: {
          entry: "logNetworkError",
          on: { DISMISS_NETWORK_ERROR: "live" },
        },
      },
    },
    {
      actions: {
        clearPendingLaunchState: assign({
          pendingLaunchState: (_) => null,
        }),
        setLaunchState: assign({
          launchState: (_, event) => event.data,
        }),
        setStationState: assign((context, event) => {
          const newRecord = event.data;
          if (!newRecord) {
            return {};
          }
          return {
            stationState: newRecord.data,
            stationRecords: [
              ...context.stationRecords.filter(
                // timestamps are in microseconds
                (record) => record.timestamp > newRecord.timestamp - STATION_RECORDS_RETENTION_MS * 1000
              ),
              newRecord,
            ],
          };
        }),
        logNetworkError: (_, event) => {
          console.error("Launch machine network error", event);
        },
      },
      services: {
        fetchLaunchState: async () => {
          const records = await api.listRecords(
            {
              source: LAUNCH_STATE_SOURCE,
              take: 1,
            },
            launchStateSchema
          );
          if (records.length === 0) {
            return initialLaunchState;
          }
          return records[0].data;
        },
        mutateLaunchState: async (context) => {
          // sanity check
          if (!context.pendingLaunchState) {
            throw new Error("No pending launch state");
          }
          await api.createRecord({
            source: LAUNCH_STATE_SOURCE,
            data: context.pendingLaunchState,
          });
          return context.pendingLaunchState;
        },
        fetchStationRecord: async (context) => {
          const latestRecord = context.stationRecords[0];
          const rangeStart = latestRecord ? latestRecord.timestamp + 1 : undefined;

          const records = await api.listRecords(
            {
              source: STATION_STATE_SOURCE,
              rangeStart,
              take: 1,
            },
            stationStateSchema
          );
          if (records.length === 0) {
            return null;
          }
          return records[0];
        },
        mutateStationOpState: async (_, event) => {
          await api.createMessage({
            target: SET_STATION_OP_STATE_TARGET,
            data: event.opState,
          });
        },
      },
      guards: {
        hasPendingLaunchState: (context) => !!context.pendingLaunchState,
        canMutateOpState: (context, event) => {
          if (event.opState === STATION_FIRE_OP_STATE) {
            return (
              checklistIsComplete(context.launchState.preFillChecklist) &&
              checklistIsComplete(context.launchState.goPoll) &&
              armStatusIsComplete(context.launchState.armStatus)
            );
          } else {
            return true;
          }
        },
      },
    }
  );
}
