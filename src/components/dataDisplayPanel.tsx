import { memo } from "react";

import { Panel } from "./design/panel";

export const DataDisplayPanel = memo(function DataDisplayPanel() {
  return (
    <div className="h-full p-4">
      <Panel>
        <h2 className="text-xl font-bold text-gray-text">Data Display</h2>
        <p className="mt-4 text-gray-text">Coming soon...</p>
      </Panel>
    </div>
  );
});
