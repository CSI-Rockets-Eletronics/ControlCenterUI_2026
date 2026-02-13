import { z } from "zod";

export const LAUNCH_STATE_DEVICE = "LAUNCH_STATE";

export const activePanelSchema = z.enum(["standby", "launch", "recovery"]);

export type ActivePanel = z.infer<typeof activePanelSchema>;

export const launchStateSchema = z.object({
  activePanel: activePanelSchema,
  mainStatus: z.object({
    batteryConnected: z.boolean(),
    fillTankOpen: z.boolean(),
    ignitersConnected: z.boolean(),
    mechPowerOn: z.boolean(),
    manualFire: z.boolean().default(false),
  }),
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
};
