import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

/**
 * Signals split into two rows of roughly equal text length (not equal
 * count), so both rows fit the same width.
 */
const TAG_ROWS: SignalType[][] = (() => {
  const all = Object.keys(SIGNAL_METADATA) as SignalType[];
  // label length + padding allowance per pill
  const w = (sig: SignalType) => SIGNAL_METADATA[sig].label.length + 4;
  const total = all.reduce((n, sig) => n + w(sig), 0);
  let acc = 0;
  let cut = all.length;
  for (let i = 0; i < all.length; i++) {
    acc += w(all[i]);
    if (acc >= total / 2) {
      cut = acc - w(all[i]) / 2 > total / 2 ? i : i + 1;
      break;
    }
  }
  return [all.slice(0, cut), all.slice(cut)];
})();

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
      aria-pressed={isSelected}
      // grow so each wrapped row spans the full width
      title={meta.label}
      // text scales with window width (~15px at 1480); long names get "…"
      // on very narrow windows instead of wrapping to a third row
      className={`flex-auto min-w-0 truncate px-3 py-2.5 rounded-lg text-[clamp(12px,0.95vw,16px)] font-medium ${
        isSelected
          ? "ui-selected"
          : "bg-gray-bg-2 text-gray-text hover:bg-gray-el-bg-hover"
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
        className="absolute z-10 px-4 py-2 text-sm font-semibold text-white rounded-lg bottom-3 right-4 bg-red-solid hover:bg-red-solid-hover"
      >
        REMOVE
      </button>
    </div>
  );
});

/** Event the ⌘K handler (Data Display) fires to focus the plot search. */
export const FOCUS_PLOT_SEARCH_EVENT = "focus-plot-search";

const SEARCH_MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl+";

/** A picked plot shown as a tag in the search field; × removes it. */
const PlotTag = memo(function PlotTag({
  signal,
  onRemove,
}: {
  signal: SignalType;
  onRemove: (signal: SignalType) => void;
}) {
  const meta = SIGNAL_METADATA[signal];
  const handleRemove = useCallback(() => onRemove(signal), [onRemove, signal]);
  return (
    <span className="inline-flex items-center py-1 pl-2 pr-1 text-sm font-medium gap-1.5 rounded-md ui-selected">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${meta.label}`}
        className="px-1 leading-none rounded opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </span>
  );
});

/** One suggestion row in the plot search list. */
const SearchOption = memo(function SearchOption({
  signal,
  index,
  active,
  picked,
  onPick,
  onHover,
}: {
  signal: SignalType;
  index: number;
  active: boolean;
  picked: boolean;
  onPick: (signal: SignalType) => void;
  onHover: (index: number) => void;
}) {
  // mousedown (not click) so the search input keeps focus
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onPick(signal);
    },
    [onPick, signal],
  );
  const handleMouseEnter = useCallback(() => onHover(index), [onHover, index]);
  const meta = SIGNAL_METADATA[signal];
  return (
    <li
      id={`plot-option-${signal}`}
      data-index={index}
      role="option"
      aria-selected={active}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      className={`flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer ${
        active ? "ui-selected" : "text-gray-text"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        {meta.label}
      </span>
      {picked && <span aria-label="selected">✓</span>}
    </li>
  );
});

/**
 * Tag input for signals. Picked plots are tags; the text cursor sits among
 * them. Typing shows suggestions (↑/↓ + Enter to pick, Esc to close).
 * ←/→ at the edge of the text move the cursor past a tag; Backspace/Delete
 * with an empty box remove the tag before/after the cursor.
 */
const PlotSearch = memo(function PlotSearch({
  signals,
  selected,
  onChange,
}: {
  signals: SignalType[];
  selected: SignalType[];
  onChange: (next: SignalType[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // cursor position among the tags (0 = before the first); null = at the end
  const [caret, setCaret] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pos =
    caret === null ? selected.length : Math.min(caret, selected.length);
  const atEnd = pos === selected.length;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? signals.filter((sig) =>
          SIGNAL_METADATA[sig].label.toLowerCase().includes(q),
        )
      : signals;
  }, [query, signals]);

  useEffect(() => {
    // ⌘K toggles: focus the search, or leave it if already focused
    const focus = () => {
      const el = inputRef.current;
      if (!el) return;
      if (document.activeElement === el) {
        el.blur();
      } else {
        el.focus();
        el.select();
      }
    };
    window.addEventListener(FOCUS_PLOT_SEARCH_EVENT, focus);
    return () => window.removeEventListener(FOCUS_PLOT_SEARCH_EVENT, focus);
  }, []);

  const removeTag = useCallback(
    (sig: SignalType) => {
      const i = selected.indexOf(sig);
      if (i < 0) return;
      onChange(selected.filter((s) => s !== sig));
      if (caret !== null && i < caret) setCaret(caret - 1);
    },
    [selected, onChange, caret],
  );

  /** Pick from suggestions: insert at the cursor, or remove if already picked. */
  const pick = useCallback(
    (sig: SignalType) => {
      if (selected.includes(sig)) {
        removeTag(sig);
      } else {
        onChange([...selected.slice(0, pos), sig, ...selected.slice(pos)]);
        if (caret !== null) setCaret(pos + 1);
      }
      setQuery("");
      setActive(0);
    },
    [selected, onChange, removeTag, pos, caret],
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActive(0);
    setOpen(e.target.value.trim().length > 0);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const empty = el.value === "";
      const caretAtStart = el.selectionStart === 0 && el.selectionEnd === 0;
      const caretAtEnd =
        el.selectionStart === el.value.length &&
        el.selectionEnd === el.value.length;

      if (e.key === "ArrowLeft" && caretAtStart && pos > 0) {
        e.preventDefault();
        setOpen(false);
        setCaret(pos - 1);
      } else if (e.key === "ArrowRight" && caretAtEnd && !atEnd) {
        e.preventDefault();
        setOpen(false);
        setCaret(pos + 1 >= selected.length ? null : pos + 1);
      } else if (e.key === "Backspace" && empty && pos > 0) {
        e.preventDefault();
        onChange(selected.filter((_, i) => i !== pos - 1));
        if (caret !== null) setCaret(pos - 1);
      } else if (e.key === "Delete" && empty && !atEnd) {
        e.preventDefault();
        onChange(selected.filter((_, i) => i !== pos));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(0);
        } else {
          setActive((i) => Math.min(i + 1, matches.length - 1));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (open && matches[active]) {
          e.preventDefault();
          pick(matches[active]);
        }
      } else if (e.key === "Escape") {
        if (open) {
          setOpen(false);
        } else {
          setQuery("");
          setCaret(null);
          el.blur();
        }
      }
    },
    [pos, atEnd, selected, onChange, caret, open, matches, active, pick],
  );

  // keep the highlighted suggestion scrolled into view
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const handleBlur = useCallback(() => {
    setOpen(false);
    setCaret(null);
  }, []);

  const handleFieldMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== inputRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  const showList = open && matches.length > 0;

  // Tags before and after the cursor are separate lists, so the <input>
  // itself never remounts and keeps focus as the cursor moves.
  return (
    <div className="relative flex-1 min-w-0">
      <div
        onMouseDown={handleFieldMouseDown}
        className="flex flex-wrap items-center pl-2 pr-12 rounded-lg gap-1.5 py-1.5 cursor-text bg-gray-bg-2 focus-within:outline focus-within:outline-2 focus-within:outline-gray-solid"
      >
        {selected.slice(0, pos).map((sig) => (
          <PlotTag key={sig} signal={sig} onRemove={removeTag} />
        ))}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="plot-search-list"
          aria-activedescendant={
            showList ? `plot-option-${matches[active]}` : undefined
          }
          aria-autocomplete="list"
          aria-label="Search plots"
          placeholder={selected.length ? "" : "Search plots"}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          // at the end it fills the row; between tags it's just wide enough
          style={atEnd ? undefined : { width: `${query.length + 1}ch` }}
          className={`py-1 text-sm bg-transparent outline-none text-gray-text placeholder:text-gray-text-dim ${
            atEnd ? "flex-1 min-w-[8rem]" : ""
          }`}
        />
        {selected.slice(pos).map((sig) => (
          <PlotTag key={sig} signal={sig} onRemove={removeTag} />
        ))}
      </div>
      <kbd className="absolute font-sans text-xs leading-none pointer-events-none -translate-y-1/2 right-3 top-1/2 text-gray-text-dim">
        {SEARCH_MOD}K
      </kbd>
      {showList && (
        <ul
          ref={listRef}
          id="plot-search-list"
          role="listbox"
          aria-label="Matching plots"
          className="absolute left-0 right-0 z-30 p-1 mt-1 overflow-y-auto rounded-lg max-h-72 bg-gray-bg-2 scrollbar-thin"
        >
          {matches.map((sig, i) => (
            <SearchOption
              key={sig}
              signal={sig}
              index={i}
              active={i === active}
              picked={selected.includes(sig)}
              onPick={pick}
              onHover={setActive}
            />
          ))}
        </ul>
      )}
    </div>
  );
});

export const PlotsPanel = memo(function PlotsPanel() {
  const plots = useTelemetryStore((state) => state.plots);
  const addPlot = useTelemetryStore((state) => state.addPlot);
  const removePlot = useTelemetryStore((state) => state.removePlot);

  // Several signals can be picked, then added as plots in one go.
  const [selectedSignals, setSelectedSignals] = useState<SignalType[]>([]);

  const handleAddPlot = useCallback(() => {
    selectedSignals.forEach((signal) => addPlot(signal));
    setSelectedSignals([]);
    // done picking: leave the search box (button click or ⌘Enter)
    const el = document.activeElement as HTMLElement | null;
    if (el?.getAttribute("aria-label") === "Search plots") el.blur();
  }, [selectedSignals, addPlot]);

  const handleSignalToggle = useCallback((signal: SignalType) => {
    setSelectedSignals((current) =>
      current.includes(signal)
        ? current.filter((s) => s !== signal)
        : [...current, signal],
    );
  }, []);

  const handleClearSelection = useCallback(() => setSelectedSignals([]), []);

  // ⌘Enter adds the tagged plots, ⌘Backspace clears the tags (Ctrl on
  // Windows/Linux). Only acts when there are tags, so ⌘Backspace still
  // deletes text normally otherwise.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (selectedSignals.length === 0) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddPlot();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleClearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSignals.length, handleAddPlot, handleClearSelection]);

  const availableSignals = Object.keys(SIGNAL_METADATA) as SignalType[];

  return (
    <div className="flex flex-col h-full p-4 ui-section">
      <div className="mb-4">
        <h2 className="mb-3 ui-section-title">Telemetry plots</h2>

        {/* Exactly two rows; pills stretch to fill each row. */}
        <div className="flex flex-col mb-3 gap-2">
          {TAG_ROWS.map((row, i) => (
            <div key={i} className="flex gap-2">
              {row.map((signal) => (
                <SignalButton
                  key={signal}
                  signal={signal}
                  isSelected={selectedSignals.includes(signal)}
                  onToggle={handleSignalToggle}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <PlotSearch
            signals={availableSignals}
            selected={selectedSignals}
            onChange={setSelectedSignals}
          />
          {/* Same size: fixed height and padding; hints show the shortcuts */}
          <button
            onClick={handleAddPlot}
            disabled={selectedSignals.length === 0}
            title={`Add plots (${SEARCH_MOD}Enter)`}
            className={`inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold rounded-lg whitespace-nowrap ${
              selectedSignals.length > 0
                ? "bg-green-solid hover:bg-green-solid-hover text-white"
                : "bg-gray-el-bg text-gray-text-dim cursor-not-allowed"
            }`}
          >
            {selectedSignals.length > 1
              ? `ADD ${selectedSignals.length} PLOTS`
              : "ADD PLOT"}
            <kbd className="font-sans text-xs font-medium opacity-70">
              {SEARCH_MOD}↵
            </kbd>
          </button>
          <button
            onClick={handleClearSelection}
            disabled={selectedSignals.length === 0}
            title={`Clear tags (${SEARCH_MOD}Backspace)`}
            className={`inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold rounded-lg whitespace-nowrap ${
              selectedSignals.length > 0
                ? "bg-red-solid hover:bg-red-solid-hover text-white"
                : "bg-gray-el-bg text-gray-text-dim cursor-not-allowed"
            }`}
          >
            CLEAR
            <kbd className="font-sans text-xs font-medium opacity-70">
              {SEARCH_MOD}⌫
            </kbd>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {plots.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-text-dim">
            Pick one or more signals, then press Add.
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
