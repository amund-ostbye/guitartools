"use client";

import { useMemo, useState } from "react";
import Fretboard, { type DisplayMode } from "./Fretboard";
import { formatInterval, getChord, qualityLabel } from "@/lib/music";
import { playNote } from "@/lib/sound";

const QUICK_CHORDS = ["D", "A", "G", "Bm", "Em", "C", "Am", "E"];

const MODES: { id: DisplayMode; label: string }[] = [
  { id: "note", label: "Notenavn" },
  { id: "interval", label: "Intervall" },
  { id: "both", label: "Begge" },
];

export default function FretboardApp() {
  const [input, setInput] = useState("D");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const chord = useMemo(() => getChord(input), [input]);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      {/* akkordvelger */}
      <div className="flex flex-col gap-3">
        <label htmlFor="chord-input" className="text-sm font-medium">
          Velg akkord
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="chord-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="f.eks. D, Bm, F#maj7"
            className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {QUICK_CHORDS.map((c) => (
            <button
              key={c}
              onClick={() => setInput(c)}
              className={`rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
                input === c
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {chord ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {chord.symbol} {qualityLabel(chord.quality)}
            </span>{" "}
            — tonene {chord.notes.join(" – ")} (
            {chord.intervals.map(formatInterval).join(", ")})
          </p>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            Fant ikke akkorden «{input}» — prøv f.eks. D, Bm eller F#maj7.
          </p>
        )}
      </div>

      {/* visningsmodus */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Vis på halsen:</span>
        <div className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDisplayMode(mode.id)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                displayMode === mode.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* gripebrettet */}
      <Fretboard
        chord={chord}
        displayMode={displayMode}
        onNoteClick={(note) => void playNote(note)}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#ef4444]" /> rot (1)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#3b82f6]" /> ters (3)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b]" /> kvint (5)
        </span>
        <span className="ml-auto">Klikk på en prikk for å høre noten 🔊</span>
      </div>
    </div>
  );
}
