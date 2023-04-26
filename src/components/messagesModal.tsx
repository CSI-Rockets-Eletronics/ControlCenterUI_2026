import { memo, useEffect } from "react";
import { twMerge } from "tailwind-merge";

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
        "absolute inset-0 flex items-center justify-center p-8",
        !open && "hidden"
      )}
    >
      <div
        className="absolute inset-0 opacity-95 bg-gray-bg-1"
        onClick={onClose}
      />
      <div className="relative w-full h-full max-w-7xl gap-4 grid grid-rows-1 grid-cols-2">
        <div className="grid grid-rows-[minmax(0,1fr),auto] gap-4">
          <SentMessagesPanel />
          <SendManualMessagePanel />
        </div>
        <div className="grid grid-rows-[auto,minmax(0,1fr)] gap-4">
          <PresetMessagesPanel />
        </div>
      </div>
    </div>
  );
});
