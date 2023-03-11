import { memo } from "react";

import { Panel } from "./design/panel";

export const MapPanel = memo(function MapPanel() {
  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Map</p>
      <iframe
        className="grow"
        // TODO
        src="http://maps.google.com/"
      />
    </Panel>
  );
});
