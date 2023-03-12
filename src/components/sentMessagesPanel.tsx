import { memo, useEffect, useRef } from "react";

import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const SentMessagesPanel = memo(function SentMessagesPanel() {
  const sentMessages = useLaunchMachineSelector(
    (state) => state.context.sentMessages
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }, [sentMessages]);

  return (
    <Panel className="px-0 grid grid-rows-[auto,minmax(0,1fr)] gap-4">
      <div className="px-4">
        <p className="text-lg text-gray-text">Sent Messages</p>
      </div>
      <div ref={scrollRef} className="flex flex-col px-4 scrollable gap-3">
        {sentMessages.map((message, index) => (
          <div
            key={index}
            className="p-2 border border-gray-border rounded-md bg-gray-el-bg"
          >
            <pre className="text-sm text-gray-text">
              {JSON.stringify(message, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </Panel>
  );
});
