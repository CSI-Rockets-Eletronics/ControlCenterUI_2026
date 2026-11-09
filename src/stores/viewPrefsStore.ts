import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type SignalType } from "@/stores/telemetryStore";

export type DataView = "cards" | "graphs" | "focus";

interface ViewPrefsState {
  /**
   * Show the older left-column panels on the Control page (Electronics
   * regulator, Solenoid timers, Command center). Off by default.
   */
  oldView: boolean;
  toggleOldView: () => void;
  /** Data Display layout. */
  dataView: DataView;
  setDataView: (view: DataView) => void;
  /** Signal shown large in the Focus view. */
  focusSignal: SignalType | null;
  setFocusSignal: (signal: SignalType) => void;
}

export const useViewPrefsStore = create<ViewPrefsState>()(
  persist(
    (set) => ({
      oldView: false,
      toggleOldView: () => set((s) => ({ oldView: !s.oldView })),
      dataView: "cards",
      setDataView: (dataView) => set({ dataView }),
      focusSignal: null,
      setFocusSignal: (focusSignal) => set({ focusSignal }),
    }),
    {
      name: "viewPrefs",
      // localStorage can throw (blocked storage); fall back to in-memory
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem("__probe", "1");
          localStorage.removeItem("__probe");
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return {
            getItem: (k) => mem.get(k) ?? null,
            setItem: (k, v) => void mem.set(k, v),
            removeItem: (k) => void mem.delete(k),
          };
        }
      }),
    },
  ),
);
