import { assign, createMachine } from "xstate";

import { Api, catchError } from "@/hooks/useApi";
import {
  ActivePanel,
  initialLaunchState,
  LAUNCH_STATE_DEVICE,
  LaunchState,
  launchStateSchema,
} from "@/lib/launchState";
import {
  DEVICES,
  parseRemoteStationState,
  remoteStationStateSchema,
  toRemoteSetStationOpStateCommand,
} from "@/lib/stationInterface";
import {
  gpsSchema,
  GpsState,
  LoadCellState,
  loadCellStateSchema,
  RadioGroundState,
  radioGroundStateSchema,
  StationOpState,
  StationRelays,
  StationState,
} from "@/lib/stationState";

const LAUNCH_STATE_FETCH_INTERVAL = 1000;
const STATION_STATE_FETCH_INTERVAL = 0; // fetch as soon as the previous fetch completes

function checklistIsComplete(checklist: Record<string, boolean>) {
  return Object.values(checklist).every(Boolean);
}

function armStatusIsComplete(armStatus: Record<string, boolean>) {
  return Object.values(armStatus).every(Boolean);
}

type DeviceRecord<T> = {
  ts: number;
  data: T;
};

export type DeviceStates = {
  firingStation: DeviceRecord<StationState> | null;
  loadCell1: DeviceRecord<LoadCellState> | null;
  loadCell2: DeviceRecord<LoadCellState> | null;
  radioGround: DeviceRecord<RadioGroundState> | null;
  gps: DeviceRecord<GpsState> | null;
};

export interface SentMessage {
  ts: Date;
  device: string;
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
      device: string;
      data: unknown;
    };

export function createLaunchMachine(
  api: Api,
  environmentKey: string,
  sessionName?: string,
  readonly = false,
  replayFromSeconds?: number,
) {
  const startTimeMicros = Date.now() * 1000;
  const canWrite = !readonly && sessionName == null;

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
          deviceStates: DeviceStates;
          sentMessages: SentMessage[];
        },
        services: {} as {
          fetchLaunchState: { data: LaunchState };
          mutateLaunchState: { data: LaunchState };
          fetchDeviceStates: { data: DeviceStates };
          mutateStationOpState: { data: SentMessage };
          sendManualMessage: { data: SentMessage };
        },
      },
      id: "launch",
      context: () => ({
        startTimeMicros,
        launchState: initialLaunchState,
        pendingLaunchState: null,
        deviceStates: {
          firingStation: null,
          loadCell1: null,
          loadCell2: null,
          radioGround: null,
          gps: null,
        },
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
                    src: "fetchDeviceStates",
                    onDone: {
                      target: "idle",
                      actions: "setDeviceStates",
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
                        src: "fetchDeviceStates",
                        onDone: {
                          target: "waitingToRefetch",
                          actions: "setDeviceStates",
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
        setDeviceStates: assign((_context, event) => {
          return { deviceStates: event.data };
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
                sessionName,
                device: LAUNCH_STATE_DEVICE,
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
              device: LAUNCH_STATE_DEVICE,
              data: context.pendingLaunchState,
            }),
          );
          return context.pendingLaunchState;
        },
        fetchDeviceStates: async () => {
          const curTimeMicros = Date.now() * 1000;
          const elapsedMicros = curTimeMicros - startTimeMicros;

          const endTs = replayFromSeconds != null ? String(elapsedMicros + replayFromSeconds * 1e6) : undefined;

          const records = await catchError(
            api.records.multiDevice.get({
              $query: {
                environmentKey,
                sessionName,
                devices: [
                  DEVICES.firingStation,
                  DEVICES.loadCell1,
                  DEVICES.loadCell2,
                  DEVICES.radioGround,
                  DEVICES.gps,
                ].join(","),
                endTs,
              },
            }),
          );

          const firingStationRaw = records[DEVICES.firingStation];
          const loadCell1Raw = records[DEVICES.loadCell1];
          const loadCell2Raw = records[DEVICES.loadCell2];
          const radioGroundRaw = records[DEVICES.radioGround];
          const gpsRaw = records[DEVICES.gps];

          return {
            firingStation: firingStationRaw
              ? {
                  ts: firingStationRaw.ts,
                  data: parseRemoteStationState(remoteStationStateSchema.parse(firingStationRaw.data)),
                }
              : null,
            loadCell1: loadCell1Raw
              ? {
                  ts: loadCell1Raw.ts,
                  data: loadCellStateSchema.parse(loadCell1Raw.data),
                }
              : null,
            loadCell2: loadCell2Raw
              ? {
                  ts: loadCell2Raw.ts,
                  data: loadCellStateSchema.parse(loadCell2Raw.data),
                }
              : null,
            radioGround: radioGroundRaw
              ? {
                  ts: radioGroundRaw.ts,
                  data: radioGroundStateSchema.parse(radioGroundRaw.data),
                }
              : null,
            gps: gpsRaw
              ? {
                  ts: gpsRaw.ts,
                  data: gpsSchema.parse(gpsRaw.data),
                }
              : null,
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
              device: DEVICES.firingStation,
              data,
            }),
          );
          console.log("Sent message", DEVICES.firingStation, data);
          return {
            ts: new Date(),
            device: DEVICES.firingStation,
            data,
          };
        },
        sendManualMessage: async (_, event) => {
          await catchError(
            api.messages.post({
              environmentKey,
              device: event.device,
              data: event.data,
            }),
          );
          console.log("Sent message", event.device, event.data);
          return {
            ts: new Date(),
            device: event.device,
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

          if (!context.deviceStates.firingStation) {
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
            if (event.value === context.deviceStates.firingStation.data.opState) {
              return false;
            }

            if (event.value === "fire") {
              const opState = context.deviceStates.firingStation.data.opState;
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
