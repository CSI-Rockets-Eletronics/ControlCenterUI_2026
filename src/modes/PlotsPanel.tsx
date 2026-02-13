import { memo, useCallback, useState } from "react";

import {
  type PlotConfig,
  SIGNAL_METADATA,
  type SignalType,
  useTelemetryStore,
} from "@/stores/telemetryStore";

import { TelemetryPlot } from "./TelemetryPlot";

interface SignalButtonProps {
  signal: SignalType;
  isSelected: boolean;
  onToggle: (signal: SignalType) => void;
}

const SignalButton = memo(function SignalButton({
  signal,
  isSelected,
  onToggle,
}: SignalButtonProps) {
  const meta = SIGNAL_METADATA[signal];

  const handleClick = useCallback(() => {
    onToggle(signal);
  }, [signal, onToggle]);

  return (
    <button
      onClick={handleClick}
      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
        isSelected
          ? "bg-blue-solid text-white shadow-lg"
          : "bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
      }`}
    >
      {meta.label}
    </button>
  );
});

interface PlotWithRemoveProps {
  plot: PlotConfig;
  onRemove: (id: string) => void;
}

const PlotWithRemove = memo(function PlotWithRemove({
  plot,
  onRemove,
}: PlotWithRemoveProps) {
  const handleRemove = useCallback(() => {
    onRemove(plot.id);
  }, [plot.id, onRemove]);

  return (
    <div className="relative">
      <TelemetryPlot plotConfig={plot} />
      <button
        onClick={handleRemove}
        className="absolute z-10 px-3 py-1 text-xs font-semibold text-white rounded-lg shadow-lg bottom-2 right-2 bg-red-solid hover:bg-red-solid-hover transition-colors"
      >
        REMOVE
      </button>
    </div>
  );
});

export const PlotsPanel = memo(function PlotsPanel() {
  const plots = useTelemetryStore((state) => state.plots);
  const addPlot = useTelemetryStore((state) => state.addPlot);
  const removePlot = useTelemetryStore((state) => state.removePlot);

  const [selectedSignal, setSelectedSignal] = useState<SignalType | null>(null);

  const handleAddPlot = useCallback(() => {
    if (selectedSignal) {
      addPlot(selectedSignal);
      setSelectedSignal(null);
    }
  }, [selectedSignal, addPlot]);

  const handleSignalToggle = useCallback((signal: SignalType) => {
    setSelectedSignal((current) => (current === signal ? null : signal));
  }, []);

  const availableSignals = Object.keys(SIGNAL_METADATA) as SignalType[];

  return (
    <div className="flex flex-col h-full p-4 border bg-gray-el-bg rounded-xl border-gray-border">
      <div className="mb-4">
        <h2 className="mb-3 text-lg font-bold text-gray-text">
          Telemetry Plots
        </h2>

        <div className="flex flex-wrap mb-3 gap-2">
          {availableSignals.map((signal) => (
            <SignalButton
              key={signal}
              signal={signal}
              isSelected={selectedSignal === signal}
              onToggle={handleSignalToggle}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddPlot}
            disabled={!selectedSignal}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedSignal
                ? "bg-green-solid hover:bg-green-solid-hover text-white shadow-lg"
                : "bg-gray-el-bg text-gray-text-dim cursor-not-allowed"
            }`}
          >
            ADD PLOT
          </button>
          {selectedSignal && (
            <div className="flex items-center px-4 py-2 text-sm rounded-lg bg-gray-el-bg text-gray-text">
              Selected: {SIGNAL_METADATA[selectedSignal].label}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {plots.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-text-dim">
            Click ADD PLOT as needed.
          </div>
        ) : (
          plots.map((plot) => (
            <PlotWithRemove key={plot.id} plot={plot} onRemove={removePlot} />
          ))
        )}
      </div>
    </div>
  );
});
