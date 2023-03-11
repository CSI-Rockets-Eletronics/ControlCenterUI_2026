import { memo } from "react";

import { Panel } from "./design/panel";

export const WeatherPanel = memo(function WeatherPanel() {
  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Weather</p>
      <iframe
        className="grow"
        // TODO show weather at current location
        src="https://www.weather.com"
      />
    </Panel>
  );
});
