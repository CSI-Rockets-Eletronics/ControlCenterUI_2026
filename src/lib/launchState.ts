import { z } from "zod";

export const LAUNCH_STATE_DEVICE = "LAUNCH_STATE";

export const activePanelSchema = z.enum(["standby", "launch", "recovery"]);

export type ActivePanel = z.infer<typeof activePanelSchema>;

export const armStatusSchema = z.record(z.boolean());
export type ArmStatus = z.infer<typeof armStatusSchema>;

export const preFillChecklistSchema = z.record(z.boolean());
export type PreFillChecklist = z.infer<typeof preFillChecklistSchema>;

export const rangePermitSchema = z.record(z.boolean());
export type RangePermit = z.infer<typeof rangePermitSchema>;

export const launchStateSchema = z.object({
  activePanel: activePanelSchema,
  mainStatus: z.object({
    batteryConnected: z.boolean(),
    fillTankOpen: z.boolean(),
    ignitersConnected: z.boolean(),
    mechPowerOn: z.boolean(),
    manualFire: z.boolean().default(false),
  }),
  armStatus: armStatusSchema.default({}),
  preFillChecklist: preFillChecklistSchema.default({}),
  rangePermit: rangePermitSchema.default({}),
});

export type LaunchState = z.infer<typeof launchStateSchema>;

export const initialLaunchState: LaunchState = {
  activePanel: "standby",
  mainStatus: {
    batteryConnected: false,
    fillTankOpen: false,
    ignitersConnected: false,
    mechPowerOn: false,
    manualFire: false,
  },
  armStatus: {},
  preFillChecklist: {},
  rangePermit: {},
};
