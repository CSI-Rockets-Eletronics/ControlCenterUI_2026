import { assign, createMachine } from "xstate";

import { Api } from "@/lib/api";
import { Command, isValidCommand } from "@/lib/command";

const TARGET = "launch_commands_test_4";

const SILENT_RESYNC_INTERVAL = 5000;

// TODO chage ids
const api = new Api("cl9vt57vf0000qw4nmwr6glcm", "cl9vtcmg30009p94ngwhb92jx");

type Events =
  | { type: "RETRY_BLOCKING_SYNC" }
  | { type: "SYNC_SILENTLY" }
  | {
      type: "SEND";
      command: Command;
    };

export const commandSenderMachine = createMachine(
  {
    tsTypes: {} as import("./commandSenderMachine.typegen").Typegen0,
    predictableActionArguments: true,
    schema: {
      events: {} as Events,
      context: {} as {
        baselineCommands: Command[];
        sendQueue: Command[];
        lastCommandReceivedAt: number | null;
      },
      services: {} as {
        fetchBaselineCommands: { data: Command[] };
        sendCommand: { data: { receivedAt: number } };
      },
    },
    id: "commandSender",
    context: {
      baselineCommands: [],
      sendQueue: [],
      lastCommandReceivedAt: null,
    },
    initial: "blockedUntilSynced",
    states: {
      blockedUntilSynced: {
        entry: "clearSendState",
        invoke: {
          src: "fetchBaselineCommands",
          onDone: {
            target: "idle",
            actions: "setBaselineCommands",
          },
          onError: "syncError",
        },
      },
      syncError: {
        on: {
          RETRY_BLOCKING_SYNC: "blockedUntilSynced",
        },
      },
      idle: {
        on: {
          SEND: { actions: "addToSendQueue" },
        },
        always: {
          target: "sending",
          cond: "hasPendingCommands",
        },
        initial: "notSilentlySyncing",
        states: {
          notSilentlySyncing: {
            after: { [SILENT_RESYNC_INTERVAL]: "silentlySyncing" },
            on: {
              SYNC_SILENTLY: "silentlySyncing",
            },
          },
          silentlySyncing: {
            invoke: {
              src: "fetchBaselineCommands",
              onDone: {
                target: "notSilentlySyncing",
                actions: "setBaselineCommands",
              },
              onError: "#commandSender.syncError",
            },
          },
        },
      },
      sending: {
        invoke: {
          src: "sendCommand",
          onDone: {
            target: "idle",
            actions: "popSendQueueAndUpdateLastCommandReceivedAt",
          },
          onError: "syncError",
        },
      },
    },
  },
  {
    actions: {
      setBaselineCommands: assign((_, event) => ({
        baselineCommands: event.data,
      })),
      clearSendState: assign((_) => ({
        sendQueue: [],
        lastCommandReceivedAt: null,
      })),
      popSendQueueAndUpdateLastCommandReceivedAt: assign((context, event) => ({
        sendQueue: context.sendQueue.slice(1),
        lastCommandReceivedAt: event.data.receivedAt,
      })),
      addToSendQueue: assign((context, event) => ({
        sendQueue: [...context.sendQueue, event.command],
      })),
    },
    services: {
      fetchBaselineCommands: async () => {
        const messages = await api.listMessages(TARGET);
        return messages.map((message) => message.data).filter(isValidCommand);
      },
      sendCommand: async (context) => {
        const commandToSend = context.sendQueue[0];
        const res = await api.createMessage(TARGET, commandToSend, context.lastCommandReceivedAt);
        return res;
      },
    },
    guards: {
      hasPendingCommands: (context) => context.sendQueue.length > 0,
    },
  }
);
