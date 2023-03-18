import { memo, useEffect } from "react";
import { twMerge } from "tailwind-merge";

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
    <div className={twMerge("absolute inset-0", !open && "hidden")}>
      <div
        className="absolute inset-0 bg-gray-bg-1 opacity-95"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex justify-center p-8 pointer-events-none scrollable">
        <div className="w-full max-w-2xl min-h-full pointer-events-auto h-fit grid grid-rows-[1fr,auto] gap-4">
          <SentMessagesPanel />
          <SendManualMessagePanel />
        </div>
      </div>
    </div>
  );
});
