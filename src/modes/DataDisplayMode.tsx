import { memo } from "react";

import {
  SIGNAL_METADATA,
  type SignalType,
  useTelemetryStore,
} from "@/stores/telemetryStore";

export const DataDisplayMode = memo(function DataDisplayMode() {
  const buffers = useTelemetryStore((state) => state.buffers);

  const signals = Object.keys(SIGNAL_METADATA) as SignalType[];

  return (
    <div className="h-full p-6 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((signal) => {
            const metadata = SIGNAL_METADATA[signal];
            const buffer = buffers.get(signal);
            const latest = buffer?.getLatest();
            const allSamples = buffer?.getAll() || [];

            const min =
              allSamples.length > 0
                ? Math.min(...allSamples.map((s) => s.value))
                : 0;
            const max =
              allSamples.length > 0
                ? Math.max(...allSamples.map((s) => s.value))
                : 0;
            const avg =
              allSamples.length > 0
                ? allSamples.reduce((sum, s) => sum + s.value, 0) /
                  allSamples.length
                : 0;

            return (
              <div
                key={signal}
                className="p-5 border bg-gray-el-bg rounded-xl border-gray-border hover:border-gray-text-dim transition-colors"
              >
                <div className="flex items-center mb-4 gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: metadata.color }}
                  />
                  <h3 className="font-semibold text-gray-text">
                    {metadata.label}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-text-dim">CURRENT</span>
                    <span className="text-2xl font-bold text-gray-text">
                      {latest ? latest.value.toFixed(2) : "--"}
                      <span className="ml-1 text-sm text-gray-text-dim">
                        {metadata.unit}
                      </span>
                    </span>
                  </div>

                  <div className="text-xs grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-gray-text-dim">MIN</div>
                      <div className="text-gray-text">{min.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-gray-text-dim">AVG</div>
                      <div className="text-gray-text">{avg.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-gray-text-dim">MAX</div>
                      <div className="text-gray-text">{max.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="pt-2 text-xs border-t border-gray-border text-gray-text-dim">
                    {allSamples.length} samples buffered
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
