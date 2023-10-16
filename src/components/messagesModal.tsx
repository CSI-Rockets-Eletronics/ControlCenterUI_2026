import { memo, useEffect } from "react";
import { twMerge } from "tailwind-merge";

import { MonitorRecordsPanel } from "./monitorRecordsPanel";
import { PresetMessagesPanel } from "./presetMessagesPanel";
import { SendManualMessagePanel } from "./sendManualMessagePanel";
import { SentMessagesPanel } from "./sentMessagesPanel";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const MessagesModal = memo(function MessagesModal({
  open,
  onClose,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={twMerge(
        "absolute inset-0 flex items-center justify-center",
        !open && "hidden",
      )}
    >
      <div
        className="absolute inset-0 opacity-95 bg-gray-bg-1"
        onClick={onClose}
      />
      <div className="relative w-full h-full p-8 max-w-[1400px] gap-4 grid grid-rows-[auto,auto] md:grid-rows-1 md:grid-cols-2 scrollable">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="z-0 grid grid-rows-[auto,auto] md:grid-rows-[minmax(0,1fr),auto] gap-4">
          <SentMessagesPanel />
          <SendManualMessagePanel />
        </div>
        <div className="z-0 grid grid-rows-[auto,auto] md:grid-rows-[auto,minmax(0,1fr)] gap-4">
          <PresetMessagesPanel />
          <MonitorRecordsPanel visible={open} />
        </div>
      </div>
    </div>
  );
});
