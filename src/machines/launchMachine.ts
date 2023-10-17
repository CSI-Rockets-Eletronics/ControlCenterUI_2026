import { assign, createMachine } from "xstate";

import { api, catchError } from "@/lib/api";
import {
  ActivePanel,
  initialLaunchState,
  LAUNCH_STATE_SOURCE,
  LaunchState,
  launchStateSchema,
} from "@/lib/launchState";
import {
  GPS_STATE_SOURCE,
  LOAD_CELL_STATE_SOURCE,
  parseRemoteStationState,
  remoteStationStateSchema,
  SET_STATION_OP_STATE_TARGET,
  STATION_STATE_SOURCE,
  toRemoteSetStationOpStateCommand,
} from "@/lib/stationInterface";
import {
  GpsState,
  gpsStateSchema,
  LoadCellState,
  loadCellStateSchema,
  StationOpState,
  StationRelays,
  StationState,
} from "@/lib/stationState";

const LAUNCH_STATE_FETCH_INTERVAL = 1000;
const STATION_STATE_FETCH_INTERVAL = 0; // fetch as soon as the previous fetch completes

const FETCH_GPS = false; // enable once we have GPS data

function checklistIsComplete(checklist: Record<string, boolean>) {
  return Object.values(checklist).every(Boolean);
}

function armStatusIsComplete(armStatus: Record<string, boolean>) {
  return Object.values(armStatus).every(Boolean);
}

export type MergedStationState = StationState & {
  loadCell: LoadCellState | null;
} & {
  gps: GpsState | null;
} & {
  timestamp: number;
};

export interface SentMessage {
  timestamp: Date;
  target: string;
  data: unknown;
}

export type LaunchMachineEvent =
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
      type: "UPDATE_MAIN_STATUS";
      data: Partial<LaunchState["mainStatus"]>;
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
      type: "MUTATE_STATION_OP_STATE";
      value: Exclude<StationOpState, "custom">;
    }
  | {
      type: "MUTATE_STATION_OP_STATE_CUSTOM";
      relays: StationRelays;
    }
  | {
      type: "SEND_MANUAL_MESSAGE";
      target: string;
      data: unknown;
    };

export function createLaunchMachine(
  environmentKey: string,
  session?: string,
  readonly = false,
  replayFromSeconds?: number,
) {
  const startTimeMicros = Date.now() * 1000;
  const canWrite = !readonly && session == null;

  return createMachine(
    {
      tsTypes: {} as import("./launchMachine.typegen").Typegen0,
      predictableActionArguments: true,
      schema: {
        events: {} as LaunchMachineEvent,
        context: {} as {
          startTimeMicros: number;
          launchState: LaunchState;
          pendingLaunchState: LaunchState | null;
          stationState: MergedStationState | null;
          sentMessages: SentMessage[];
        },
        services: {} as {
          fetchLaunchState: { data: LaunchState };
          mutateLaunchState: { data: LaunchState };
          fetchStationRecord: { data: MergedStationState | null };
          mutateStationOpState: { data: SentMessage };
          sendManualMessage: { data: SentMessage };
        },
      },
      id: "launch",
      context: () => ({
        startTimeMicros,
        launchState: initialLaunchState,
        pendingLaunchState: null,
        stationState: null,
        sentMessages: [],
      }),
      initial: "live",
      states: {
        live: {
          type: "parallel",
          states: {
            launchState: {
              initial: "fetching",
              states: {
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
                idle: {
                  always: { cond: "hasPendingLaunchState", target: "mutating" },
                  on: {
                    UPDATE_ACTIVE_PANEL: { actions: "updateActivePanel", cond: "canWrite" },
                    UPDATE_PRE_FILL_CHECKLIST: { actions: "updatePreFillChecklist", cond: "canWrite" },
                    UPDATE_GO_POLL: { actions: "updateGoPoll", cond: "canWrite" },
                    UPDATE_MAIN_STATUS: { actions: "updateMainStatus", cond: "canWrite" },
                    UPDATE_ARM_STATUS: { actions: "updateArmStatus", cond: "canUpdateArmStatus" },
                    UPDATE_RANGE_PERMIT: { actions: "updateRangePermit", cond: "canWrite" },
                  },
                  initial: "waitingToRefetch",
                  states: {
                    waitingToRefetch: {
                      after: { [LAUNCH_STATE_FETCH_INTERVAL]: "refetching" },
                    },
                    refetching: {
                      invoke: {
                        src: "fetchLaunchState",
                        onDone: {
                          target: "waitingToRefetch",
                          actions: "setLaunchState",
                        },
                        onError: "#launch.networkError",
                      },
                    },
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
              initial: "fetching",
              states: {
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
                idle: {
                  on: {
                    MUTATE_STATION_OP_STATE: { target: "mutatingOpState", cond: "canMutateOpState" },
                    MUTATE_STATION_OP_STATE_CUSTOM: { target: "mutatingOpState", cond: "canMutateOpState" },
                    SEND_MANUAL_MESSAGE: { target: "sendingManualMessage", cond: "canWrite" },
                  },
                  initial: "waitingToRefetch",
                  states: {
                    waitingToRefetch: {
                      after: { [STATION_STATE_FETCH_INTERVAL]: "refetching" },
                    },
                    refetching: {
                      invoke: {
                        src: "fetchStationRecord",
                        onDone: {
                          target: "waitingToRefetch",
                          actions: "setStationState",
                        },
                        onError: "#launch.networkError",
                      },
                    },
                  },
                },
                mutatingOpState: {
                  invoke: {
                    src: "mutateStationOpState",
                    onDone: {
                      target: "idle.refetching",
                      actions: "addSentMessage",
                    },
                    onError: "#launch.networkError",
                  },
                },
                sendingManualMessage: {
                  invoke: {
                    src: "sendManualMessage",
                    onDone: {
                      target: "idle.refetching",
                      actions: "addSentMessage",
                    },
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
        updateActivePanel: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            activePanel: event.value,
          }),
        }),
        updatePreFillChecklist: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            preFillChecklist: { ...context.launchState.preFillChecklist, ...event.data },
          }),
        }),
        updateGoPoll: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            goPoll: { ...context.launchState.goPoll, ...event.data },
          }),
        }),
        updateMainStatus: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            mainStatus: { ...context.launchState.mainStatus, ...event.data },
          }),
        }),
        updateArmStatus: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            armStatus: { ...context.launchState.armStatus, ...event.data },
          }),
        }),
        updateRangePermit: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            rangePermit: { ...context.launchState.rangePermit, ...event.data },
          }),
        }),
        setStationState: assign((_context, event) => {
          const stationState = event.data;
          if (!stationState) {
            return {};
          }
          return { stationState };
        }),
        logNetworkError: (_, event) => {
          console.error("Launch machine network error", event);
        },
        addSentMessage: assign((context, event) => {
          return {
            sentMessages: [...context.sentMessages, event.data],
          };
        }),
      },
      services: {
        fetchLaunchState: async () => {
          const { records } = await catchError(
            api.records.get({
              $query: {
                environmentKey,
                session,
                path: LAUNCH_STATE_SOURCE,
                take: "1",
              },
            }),
          );
          if (records.length === 0) {
            return initialLaunchState;
          }
          return launchStateSchema.parse(records[0].data);
        },
        mutateLaunchState: async (context) => {
          // sanity check
          if (!context.pendingLaunchState) {
            throw new Error("No pending launch state");
          }
          await catchError(
            api.records.post({
              environmentKey,
              path: LAUNCH_STATE_SOURCE,
              data: context.pendingLaunchState,
            }),
          );
          return context.pendingLaunchState;
        },
        fetchStationRecord: async () => {
          const curTimeMicros = Date.now() * 1000;
          const elapsedMicros = curTimeMicros - startTimeMicros;

          const endTs = replayFromSeconds != null ? String(elapsedMicros + replayFromSeconds * 1e6) : undefined;

          // merges different sources into one record

          const [remoteStationRecords, loadCellRecords, gpsRecords] = await Promise.all([
            catchError(
              api.records.get({
                $query: {
                  environmentKey,
                  session,
                  path: STATION_STATE_SOURCE,
                  take: "1",
                  endTs,
                },
              }),
            ),
            catchError(
              api.records.get({
                $query: {
                  environmentKey,
                  session,
                  path: LOAD_CELL_STATE_SOURCE,
                  take: "1",
                  endTs,
                },
              }),
            ),
            FETCH_GPS
              ? catchError(
                  api.records.get({
                    $query: {
                      environmentKey,
                      session,
                      path: GPS_STATE_SOURCE,
                      take: "1",
                      endTs,
                    },
                  }),
                )
              : { records: [] },
          ]);

          if (remoteStationRecords.records.length === 0) {
            return null;
          }

          const timestamp = remoteStationRecords.records[0].ts;

          const stationState = parseRemoteStationState(
            remoteStationStateSchema.parse(remoteStationRecords.records[0].data),
          );
          const loadCellRecord = loadCellRecords.records.length > 0 ? loadCellRecords.records[0] : null;
          const gpsRecord = gpsRecords.records.length > 0 ? gpsRecords.records[0] : null;

          return {
            timestamp,
            ...stationState,
            loadCell: loadCellRecord ? loadCellStateSchema.parse(loadCellRecord.data) : null,
            gps: gpsRecord ? gpsStateSchema.parse(gpsRecord.data) : null,
          };
        },
        mutateStationOpState: async (_context, event) => {
          const data =
            event.type === "MUTATE_STATION_OP_STATE_CUSTOM"
              ? toRemoteSetStationOpStateCommand({
                  opState: "custom",
                  relays: event.relays,
                })
              : toRemoteSetStationOpStateCommand({
                  opState: event.value,
                });
          await catchError(
            api.messages.post({
              environmentKey,
              path: SET_STATION_OP_STATE_TARGET,
              data,
            }),
          );
          console.log("Sent message", SET_STATION_OP_STATE_TARGET, data);
          return {
            timestamp: new Date(),
            target: SET_STATION_OP_STATE_TARGET,
            data,
          };
        },
        sendManualMessage: async (_, event) => {
          await catchError(
            api.messages.post({
              environmentKey,
              path: event.target,
              data: event.data,
            }),
          );
          console.log("Sent message", event.target, event.data);
          return {
            timestamp: new Date(),
            target: event.target,
            data: event.data,
          };
        },
      },
      guards: {
        hasPendingLaunchState: (context) => !!context.pendingLaunchState,
        canWrite: () => canWrite,
        canUpdateArmStatus: (context, event) => {
          if (!canWrite) {
            return false;
          }

          const oldArmStatus = context.launchState.armStatus;
          const newArmStatus = { ...oldArmStatus, ...event.data };
          return (
            newArmStatus.commandCenter !== oldArmStatus.commandCenter ||
            newArmStatus.abortControl !== oldArmStatus.abortControl
          );
        },
        canMutateOpState: (context, event) => {
          if (!canWrite) {
            return false;
          }

          const fireReqsComplete =
            checklistIsComplete(context.launchState.preFillChecklist) &&
            checklistIsComplete(context.launchState.goPoll) &&
            armStatusIsComplete(context.launchState.armStatus);

          if (event.type === "MUTATE_STATION_OP_STATE_CUSTOM") {
            if (event.relays.pyroValve || event.relays.pyroCutter || event.relays.igniter) {
              return fireReqsComplete;
            } else {
              return true;
            }
          } else {
            if (event.value === context.stationState?.opState) {
              return false;
            }

            if (event.value === "fire") {
              const opState = context.stationState?.opState;
              const validFireSourceState = opState === "standby" || opState === "keep" || opState === "custom";
              return fireReqsComplete && validFireSourceState;
            } else if (event.value === "fire-manual-igniter" || event.value === "fire-manual-valve") {
              return fireReqsComplete;
            } else {
              return true;
            }
          }
        },
      },
    },
  );
}
