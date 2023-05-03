import { z } from "zod";

export const LAUNCH_STATE_SOURCE = "LAUNCH_STATE";

export const activePanelSchema = z.enum(["standby", "launch", "recovery"]);

export type ActivePanel = z.infer<typeof activePanelSchema>;

export const launchStateSchema = z.object({
  activePanel: activePanelSchema,
  preFillChecklist: z.object({
    fillRelay: z.boolean(),
    abortRelay: z.boolean(),
    fireRelay: z.boolean(),
    fillSolenoid: z.boolean(),
    abortSolenoid: z.boolean(),
    wetGround: z.boolean(),
    openTank: z.boolean(),
  }),
  goPoll: z.object({
    safetyOfficer1: z.boolean(),
    safetyOfficer2: z.boolean(),
    adviser: z.boolean(),
    propLead: z.boolean(),
    elecLead: z.boolean(),
  }),
  mainStatus: z.object({
    batteryConnected: z.boolean(),
    fillTankOpen: z.boolean(),
    ignitersConnected: z.boolean(),
    mechPowerOn: z.boolean(),
    manualFire: z.boolean().default(false),
  }),
  armStatus: z.object({
    commandCenter: z.boolean(),
    abortControl: z.boolean(),
  }),
  rangePermit: z.object({
    safetyOfficer1: z.boolean(),
    safetyOfficer2: z.boolean(),
    adviser: z.boolean(),
  }),
});

export type LaunchState = z.infer<typeof launchStateSchema>;

export const initialLaunchState: LaunchState = {
  activePanel: "standby",
  preFillChecklist: {
    fillRelay: false,
    abortRelay: false,
    fireRelay: false,
    fillSolenoid: false,
    abortSolenoid: false,
    wetGround: false,
    openTank: false,
  },
  goPoll: {
    safetyOfficer1: false,
    safetyOfficer2: false,
    adviser: false,
    propLead: false,
    elecLead: false,
  },
  mainStatus: {
    batteryConnected: false,
    fillTankOpen: false,
    ignitersConnected: false,
    mechPowerOn: false,
    manualFire: false,
  },
  armStatus: {
    commandCenter: false,
    abortControl: false,
  },
  rangePermit: {
    safetyOfficer1: false,
    safetyOfficer2: false,
    adviser: false,
  },
};
