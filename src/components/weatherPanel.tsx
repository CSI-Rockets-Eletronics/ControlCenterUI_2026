import { memo, useEffect, useRef } from "react";

import { Panel } from "./design/panel";

const WIDGET_ID = "ww_6c99c8c4ca696";

export const WeatherPanel = memo(function WeatherPanel() {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parentEl = parentRef.current;
    if (!parentEl) return;

    parentEl.innerHTML = `
      <div
        id="${WIDGET_ID}"
        v="1.3"
        loc="auto"
        a='{"t":"horizontal","lang":"en","sl_lpl":1,"ids":[],"font":"Arial","sl_ics":"one_a","sl_sot":"fahrenheit","cl_bkg":"#616161","cl_font":"#FFFFFF","cl_cloud":"#FFFFFF","cl_persp":"#81D4FA","cl_sun":"#FFC107","cl_moon":"#FFC107","cl_thund":"#FF5722"}'
      >
        <a
          href="https://weatherwidget.org/android-app/"
          id="${WIDGET_ID}_u"
          target="_blank"
          style="display:none;"
          >Download weather app for android</a
        >
      </div>
    `;

    const script = document.createElement("script");
    script.src = `https://app1.weatherwidget.org/js/?id=${WIDGET_ID}`;
    parentEl.appendChild(script);
  }, []);

  return (
    <Panel>
      <div className="overflow-hidden rounded-md" ref={parentRef} />
      <style>
        {`
          #ww_6c99c8c4ca696 .ww_source {
            display: none;
          }
        `}
      </style>
    </Panel>
  );
});
