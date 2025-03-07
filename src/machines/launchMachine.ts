import { assign, createMachine } from "xstate";
import { z } from "zod";

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
  FsCommandMessage,
  FsInjectorTransducersRecord,
  fsInjectorTransducersRecordSchema,
  FsLoxGn2TransducersRecord,
  fsLoxGn2TransducersRecordSchema,
  FsStateRecord,
  fsStateRecordSchema,
  FsThermocouplesRecord,
  fsThermocouplesRecordSchema,
  LoadCellRecord,
  loadCellRecordSchema,
  RadioGroundRecord,
  radioGroundRecordSchema,
} from "@/lib/serverSchemas";
import { fsStateToCommand } from "@/lib/serverSchemaUtils";

const LAUNCH_STATE_FETCH_INTERVAL = 1000;
const STATION_STATE_FETCH_INTERVAL = 0; // fetch as soon as the previous fetch completes

function checklistIsComplete(checklist: Record<string, boolean>) {
  return Object.values(checklist).every(Boolean);
}

function armStatusIsComplete(armStatus: Record<string, boolean>) {
  return Object.values(armStatus).every(Boolean);
}

export type DeviceRecord<T> = {
  ts: number;
  data: T;
};

export type DeviceStates = {
  fsState: DeviceRecord<FsStateRecord> | null;
  fsLoxGn2Transducers: DeviceRecord<FsLoxGn2TransducersRecord> | null;
  fsInjectorTransducers: DeviceRecord<FsInjectorTransducersRecord> | null;
  fsThermocouples: DeviceRecord<FsThermocouplesRecord> | null;
  loadCell1: DeviceRecord<LoadCellRecord> | null;
  loadCell2: DeviceRecord<LoadCellRecord> | null;
  radioGround: DeviceRecord<RadioGroundRecord> | null;
};

export interface PendingMessage {
  device: string;
  data: unknown;
}

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
      type: "SEND_FS_COMMAND";
      value: FsCommandMessage;
    }
  | {
      type: "SEND_MANUAL_MESSAGES";
      messages: PendingMessage[];
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
          sendFsCommand: { data: SentMessage[] };
          sendManualMessages: { data: SentMessage[] };
        },
      },
      id: "launch",
      context: () => ({
        startTimeMicros,
        launchState: initialLaunchState,
        pendingLaunchState: null,
        deviceStates: {
          fsState: null,
          fsLoxGn2Transducers: null,
          fsInjectorTransducers: null,
          fsThermocouples: null,
          loadCell1: null,
          loadCell2: null,
          radioGround: null,
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
                    SEND_FS_COMMAND: { target: "sendingFsCommand", cond: "canSendFsCommand" },
                    SEND_MANUAL_MESSAGES: { target: "sendingManualMessages", cond: "canWrite" },
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
                sendingFsCommand: {
                  invoke: {
                    src: "sendFsCommand",
                    onDone: {
                      target: "idle.refetching",
                      actions: "addSentMessages",
                    },
                    onError: "#launch.networkError",
                  },
                },
                sendingManualMessages: {
                  invoke: {
                    src: "sendManualMessages",
                    onDone: {
                      target: "idle.refetching",
                      actions: "addSentMessages",
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
        addSentMessages: assign((context, event) => {
          return {
            sentMessages: [...context.sentMessages, ...event.data],
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
                  DEVICES.fsState,
                  DEVICES.fsLoxGn2Transducers,
                  DEVICES.fsInjectorTransducers,
                  DEVICES.fsThermocouples,
                  DEVICES.loadCell1,
                  DEVICES.loadCell2,
                  DEVICES.radioGround,
                ].join(","),
                endTs,
              },
            }),
          );

          const fsStateRaw = records[DEVICES.fsState];
          const fsLoxGn2TransducersRaw = records[DEVICES.fsLoxGn2Transducers];
          const fsInjectorTransducersRaw = records[DEVICES.fsInjectorTransducers];
          const fsThermocouplesRaw = records[DEVICES.fsThermocouples];
          const loadCell1Raw = records[DEVICES.loadCell1];
          const loadCell2Raw = records[DEVICES.loadCell2];
          const radioGroundRaw = records[DEVICES.radioGround];

          const parseRecord = <T>(schema: z.ZodType<T>, record: DeviceRecord<unknown> | null) => {
            return record ? { ts: record.ts, data: schema.parse(record.data) } : null;
          };

          return {
            fsState: parseRecord(fsStateRecordSchema, fsStateRaw),
            fsLoxGn2Transducers: parseRecord(fsLoxGn2TransducersRecordSchema, fsLoxGn2TransducersRaw),
            fsInjectorTransducers: parseRecord(fsInjectorTransducersRecordSchema, fsInjectorTransducersRaw),
            fsThermocouples: parseRecord(fsThermocouplesRecordSchema, fsThermocouplesRaw),
            loadCell1: parseRecord(loadCellRecordSchema, loadCell1Raw),
            loadCell2: parseRecord(loadCellRecordSchema, loadCell2Raw),
            radioGround: parseRecord(radioGroundRecordSchema, radioGroundRaw),
          };
        },
        sendFsCommand: async (_context, event) => {
          await catchError(
            api.messages.post({
              environmentKey,
              device: DEVICES.firingStation,
              data: event.value,
            }),
          );
          console.log("Sent message", DEVICES.firingStation, event.value);
          return [
            {
              ts: new Date(),
              device: DEVICES.firingStation,
              data: event.value,
            },
          ];
        },
        sendManualMessages: async (_, event) => {
          await Promise.all(
            event.messages.map(async (message) => {
              await catchError(
                api.messages.post({
                  environmentKey,
                  device: message.device,
                  data: message.data,
                }),
              );
              console.log("Sent message", message.device, message.data);
            }),
          );
          const ts = new Date();
          return event.messages.map((message) => ({
            ts,
            device: message.device,
            data: message.data,
          }));
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
        canSendFsCommand: (context, event) => {
          if (!canWrite) {
            return false;
          }

          const fsState = context.deviceStates.fsState;
          const command = event.value;

          if (!fsState) {
            return false;
          }

          const fireReqsComplete =
            checklistIsComplete(context.launchState.preFillChecklist) &&
            checklistIsComplete(context.launchState.goPoll) &&
            armStatusIsComplete(context.launchState.armStatus);

          if (command.command === "STATE_CUSTOM") {
            if (command.dome_pilot_open || command.run || command.water_suppression || command.igniter) {
              return fireReqsComplete;
            } else {
              return true;
            }
          } else {
            if (command.command === fsStateToCommand(fsState.data.state)) {
              return false;
            }

            if (command.command === "STATE_FIRE") {
              const state = fsState.data.state;
              const validFireSourceState = state === "GN2_STANDBY" || state === "CUSTOM";
              return fireReqsComplete && validFireSourceState;
            } else if (
              command.command === "STATE_FIRE_MANUAL_DOME_PILOT_OPEN" ||
              command.command === "STATE_FIRE_MANUAL_DOME_PILOT_CLOSE" ||
              command.command === "STATE_FIRE_MANUAL_IGNITER" ||
              command.command === "STATE_FIRE_MANUAL_RUN"
            ) {
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
