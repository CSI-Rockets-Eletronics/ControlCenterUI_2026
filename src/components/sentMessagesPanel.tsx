import { memo, useEffect, useRef } from "react";

import { CodeBlock } from "./design/codeBlock";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const SentMessagesPanel = memo(function SentMessagesPanel() {
  const sentMessages = useLaunchMachineSelector(
    (state) => state.context.sentMessages,
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
          <CodeBlock key={index}>
            {JSON.stringify(
              {
                ts: message.ts,
                path: message.path,
                data: message.data,
              },
              null,
              2,
            )}
          </CodeBlock>
        ))}
      </div>
    </Panel>
  );
});
