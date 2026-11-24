"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  chordNotesWithOctave,
  droneNotesFor,
  fullChordNotes,
  getChord,
  type ChordInfo,
} from "@/lib/music";
import { playChordStrum, playClick, startPad, stopPad } from "@/lib/sound";

const PRESETS = ["D A G Bm", "G C D Em", "Am F C G", "Em C G D"];
const BEATS_PER_CHORD = 4; // hver akkord varer én takt (4 slag)

type StrumMode = "off" | "triad" | "full";
type SustainMode = "off" | "triad" | "full";

// Bakgrunnstoner for en akkord: drone (rot+kvint) og/eller hele akkorden med sustain
function padNotesFor(
  symbol: string,
  drone: boolean,
  sustain: SustainMode,
): string[] {
  const notes = new Set<string>();
  if (drone) droneNotesFor(symbol).forEach((n) => notes.add(n));
  if (sustain === "triad")
    chordNotesWithOctave(symbol).forEach((n) => notes.add(n));
  if (sustain === "full") fullChordNotes(symbol).forEach((n) => notes.add(n));
  return [...notes];
}

type Props = {
  // kalles hver takt med den aktive akkorden (null når spilleren er stoppet)
  onActiveChordChange: (chord: ChordInfo | null) => void;
};

export default function ProgressionPlayer({ onActiveChordChange }: Props) {
  const [text, setText] = useState("D A G Bm");
  const [bpm, setBpm] = useState(90);
  const [click, setClick] = useState(true);
  const [strumMode, setStrumMode] = useState<StrumMode>("triad");
  const [drone, setDrone] = useState(true);
  const [sustainMode, setSustainMode] = useState<SustainMode>("off");
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const progression = useMemo(
    () => text.trim().split(/[\s,\-|]+/).filter(Boolean),
    [text],
  );

  // Referanser slik at lyd-effekten ikke starter på nytt ved små endringer
  const bpmRef = useRef(bpm);
  const clickRef = useRef(click);
  const strumRef = useRef(strumMode);
  const droneRef = useRef(drone);
  const sustainRef = useRef(sustainMode);
  useEffect(() => {
    bpmRef.current = bpm;
    clickRef.current = click;
    strumRef.current = strumMode;
    droneRef.current = drone;
    sustainRef.current = sustainMode;
    if (!drone && sustainMode === "off" && playing) void stopPad(); // skru av med én gang
    if (playing) {
      void import("tone").then((Tone) => {
        Tone.getTransport().bpm.value = bpm;
      });
    }
  }, [bpm, click, strumMode, drone, sustainMode, playing]);

  // Selve avspillingen: Tone.Transport gir presis timing for klikk og strum,
  // Tone.getDraw() synkroniserer React-state (aktiv akkord) med lyden.
  useEffect(() => {
    if (!playing || progression.length === 0) return;
    let cancelled = false;
    let started = false;
    void (async () => {
      const Tone = await import("tone");
      if (cancelled) return;
      await Tone.start();
      const transport = Tone.getTransport();
      transport.bpm.value = bpmRef.current;
      transport.cancel(0);
      let beat = 0;
      transport.scheduleRepeat((time) => {
        const barStart = beat % BEATS_PER_CHORD === 0;
        if (barStart) {
          const index = Math.floor(beat / BEATS_PER_CHORD) % progression.length;
          const symbol = progression[index];
          Tone.getDraw().schedule(() => {
            setActiveIndex(index);
            onActiveChordChange(getChord(symbol));
          }, time);
          if (strumRef.current === "triad")
            void playChordStrum(symbol, time, "triad");
          else if (strumRef.current === "full")
            void playChordStrum(symbol, time, "full");
          const padNotes = padNotesFor(symbol, droneRef.current, sustainRef.current);
          if (padNotes.length > 0) void startPad(padNotes, time);
        }
        if (clickRef.current) void playClick(barStart, time);
        beat += 1;
      }, "4n");
      transport.start(0);
      started = true;
    })();
    return () => {
      cancelled = true;
      if (started) {
        setActiveIndex(null);
        onActiveChordChange(null);
      }
      void import("tone").then((Tone) => {
        Tone.getTransport().stop();
        Tone.getTransport().cancel(0);
      });
      void stopPad();
    };
  }, [playing, progression, onActiveChordChange]);

  const toggle = () => setPlaying((p) => !p);

  return (
    <section className="flex w-full max-w-5xl flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="progression-input" className="text-sm font-medium">
          Progresjon:
        </label>
        <input
          id="progression-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="f.eks. D A G Bm"
          className="w-52 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setText(preset)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={toggle}
          disabled={!playing && progression.length === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {playing ? "■ Stopp" : "▶ Spill av"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          Tempo
          <input
            type="range"
            min={60}
            max={160}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-10 font-mono text-sm">{bpm} BPM</span>
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={click}
            onChange={(e) => setClick(e.target.checked)}
          />
          Klikk (metronom)
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          Strum hver takt
          <select
            value={strumMode}
            onChange={(e) => setStrumMode(e.target.value as StrumMode)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="off">Av</option>
            <option value="triad">Triade</option>
            <option value="full">Full akkord</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={drone}
            onChange={(e) => setDrone(e.target.checked)}
          />
          Dronelyd (rot + kvint)
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          Sustain
          <select
            value={sustainMode}
            onChange={(e) => setSustainMode(e.target.value as SustainMode)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="off">Av</option>
            <option value="triad">Triade</option>
            <option value="full">Full akkord</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {progression.map((symbol, index) => (
          <span
            key={`${symbol}-${index}`}
            className={`rounded-md border px-2.5 py-1 font-mono text-sm ${
              playing && index === activeIndex
                ? "border-zinc-900 bg-zinc-900 font-bold text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            {symbol}
          </span>
        ))}
        {playing && activeIndex !== null && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            nå spilles <b>{progression[activeIndex]}</b> ({activeIndex + 1}/
            {progression.length})
          </span>
        )}
      </div>
    </section>
  );
}
