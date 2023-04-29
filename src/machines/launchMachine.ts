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
  GPS_STATE_SOURCE,
  parseRemoteStationState,
  remoteStationStateSchema,
  SET_STATION_OP_STATE_TARGET,
  STATION_STATE_SOURCE,
  toRemoteSetStationOpStateCommand,
} from "@/lib/stationInterface";
import { GpsState, gpsStateSchema, StationOpState, StationState } from "@/lib/stationState";

const LAUNCH_STATE_FETCH_INTERVAL = 1000;
const STATION_STATE_FETCH_INTERVAL = 0; // fetch as soon as the previous fetch completes

const FETCH_GPS = false; // enable once we have GPS data

function checklistIsComplete(checklist: Record<string, boolean>) {
  return Object.values(checklist).every(Boolean);
}

function armStatusIsComplete(armStatus: Record<string, boolean>) {
  return Object.values(armStatus).every(Boolean);
}

export type MergedStationState = StationState & { gps: GpsState | null };

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
      type: "UPDATE_VISUAL_CONTACT_CONFIRMED";
      value: boolean;
    }
  | {
      type: "MUTATE_STATION_OP_STATE";
      value: StationOpState;
    }
  | {
      type: "SEND_MANUAL_MESSAGE";
      target: string;
      data: unknown;
    };

export function createLaunchMachine(api: Api, replayFromSeconds: number | null) {
  const startTimeMicros = Date.now() * 1000;

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
          fetchStationRecord: { data: ApiRecord<MergedStationState> | null };
          mutateStationOpState: { data: SentMessage };
          sendManualMessage: { data: SentMessage };
        },
      },
      id: "launch",
      context: {
        startTimeMicros,
        launchState: initialLaunchState,
        pendingLaunchState: null,
        stationState: null,
        sentMessages: [],
      },
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
                    UPDATE_ACTIVE_PANEL: { actions: "updateActivePanel" },
                    UPDATE_PRE_FILL_CHECKLIST: { actions: "updatePreFillChecklist" },
                    UPDATE_GO_POLL: { actions: "updateGoPoll" },
                    UPDATE_MAIN_STATUS: { actions: "updateMainStatus" },
                    UPDATE_ARM_STATUS: { actions: "updateArmStatus", cond: "canUpdateArmStatus" },
                    UPDATE_RANGE_PERMIT: { actions: "updateRangePermit" },
                    UPDATE_VISUAL_CONTACT_CONFIRMED: { actions: "updateVisualContactConfirmed" },
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
                    MUTATE_STATION_OP_STATE: {
                      target: "mutatingOpState",
                      cond: "canMutateOpState",
                    },
                    SEND_MANUAL_MESSAGE: {
                      target: "sendingManualMessage",
                    },
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
        updateVisualContactConfirmed: assign({
          pendingLaunchState: (context, event) => ({
            ...context.launchState,
            visualContactConfirmed: event.value,
          }),
        }),
        setStationState: assign((context, event) => {
          const newRecord = event.data;
          if (!newRecord) {
            return {};
          }
          return { stationState: newRecord.data };
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
        fetchStationRecord: async () => {
          const curTimeMicros = Date.now() * 1000;
          const elapsedMicros = curTimeMicros - startTimeMicros;

          const useRelativeTimestamps = replayFromSeconds != null;
          const rangeEnd = useRelativeTimestamps ? elapsedMicros + replayFromSeconds * 1e6 : undefined;

          // merges station and gps data into one record

          const remoteStationRecords = await api.listRecords(
            {
              source: STATION_STATE_SOURCE,
              take: 1,
              useRelativeTimestamps,
              rangeEnd,
            },
            remoteStationStateSchema
          );

          const gpsRecords = FETCH_GPS
            ? await api.listRecords(
                {
                  source: GPS_STATE_SOURCE,
                  take: 1,
                  useRelativeTimestamps,
                  rangeEnd,
                },
                gpsStateSchema
              )
            : [];

          if (remoteStationRecords.length === 0) {
            return null;
          }

          const timestamp = remoteStationRecords[0].timestamp;

          const stationState = parseRemoteStationState(remoteStationRecords[0].data);
          const gpsRecord = gpsRecords.length > 0 ? gpsRecords[0] : null;

          return {
            timestamp,
            data: {
              ...stationState,
              gps: gpsRecord?.data ?? null,
            },
          };
        },
        mutateStationOpState: async (_, event) => {
          const message = {
            target: SET_STATION_OP_STATE_TARGET,
            data: toRemoteSetStationOpStateCommand(event.value),
          };
          await api.createMessage(message);
          console.log("Sent message", message);
          return { ...message, timestamp: new Date() };
        },
        sendManualMessage: async (_, event) => {
          const message = {
            target: event.target,
            data: event.data,
          };
          await api.createMessage(message);
          console.log("Sent message", message);
          return { ...message, timestamp: new Date() };
        },
      },
      guards: {
        hasPendingLaunchState: (context) => !!context.pendingLaunchState,
        canUpdateArmStatus: (context, event) => {
          const oldArmStatus = context.launchState.armStatus;
          const newArmStatus = { ...oldArmStatus, ...event.data };
          return (
            newArmStatus.commandCenter !== oldArmStatus.commandCenter ||
            newArmStatus.abortControl !== oldArmStatus.abortControl
          );
        },
        canMutateOpState: (context, event) => {
          if (event.value === context.stationState?.opState) {
            return false;
          }

          if (event.value === "fire") {
            return (
              checklistIsComplete(context.launchState.preFillChecklist) &&
              checklistIsComplete(context.launchState.goPoll) &&
              armStatusIsComplete(context.launchState.armStatus) &&
              context.stationState?.opState === "keep"
            );
          } else {
            return true;
          }
        },
      },
    }
  );
}
