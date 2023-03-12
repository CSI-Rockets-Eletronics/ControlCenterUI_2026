import { memo, useEffect } from "react";

import { SentMessagesPanel } from "./sentMessagesPanel";

interface Props {
  onClose: () => void;
}

export const MessagesModal = memo(function MessagesModal({ onClose }: Props) {
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
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div
        className="absolute inset-0 opacity-95 bg-gray-bg-1"
        onClick={onClose}
      />
      <div className="relative w-full h-full max-w-2xl grid grid-rows-[minmax(0,1fr),auto]">
        <SentMessagesPanel />
        <div />
      </div>
    </div>
  );
});
