"use client";

import {
  FRET_COUNT,
  STRINGS,
  STRING_THICKNESS,
  colorForInterval,
  formatInterval,
  intervalInChord,
  noteAt,
  pitchClassOf,
  type ChordInfo,
} from "@/lib/music";

export type DisplayMode = "note" | "interval" | "both";

// Geometri for SVG-gripebrettet
const LEFT = 64; // plass til åpne strenger helt til venstre
const RIGHT = 24;
const TOP = 28;
const BOTTOM = 36; // plass til båndnumre nederst
const FRET_W = 62;
const STRING_DY = 44;

const WIDTH = LEFT + FRET_COUNT * FRET_W + RIGHT;
const HEIGHT = TOP + (STRINGS.length - 1) * STRING_DY + BOTTOM;

const INLAY_FRETS = new Set([3, 5, 7, 9, 15]);
const DOUBLE_INLAY_FRET = 12;

// Visningsrekkefølge på halsen: tynn e (høyest) øverst, tykk E nederst
const DISPLAY_ORDER = STRINGS.map((_, i) => STRINGS.length - 1 - i);

function fretX(fret: number): number {
  return LEFT + fret * FRET_W;
}
function stringY(stringIndex: number): number {
  return TOP + stringIndex * STRING_DY;
}
// x-posisjon for noten i et bånd (åpen streng sitter venstre for gripebrettet)
function noteX(fret: number): number {
  return fret === 0 ? LEFT - 28 : fretX(fret) - FRET_W / 2;
}

type Props = {
  chord: ChordInfo | null;
  displayMode: DisplayMode;
  onNoteClick: (note: string) => void;
};

export default function Fretboard({ chord, displayMode, onNoteClick }: Props) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full text-zinc-800 select-none dark:text-zinc-100"
      role="img"
      aria-label="Interaktivt gitarhals"
    >
      {/* bakgrunn */}
      <rect
        x={8}
        y={4}
        width={WIDTH - 16}
        height={HEIGHT - 8}
        rx={10}
        className="fill-amber-50 dark:fill-zinc-900"
      />

      {/* inlay-merker i gripebrettet */}
      {Array.from({ length: FRET_COUNT }, (_, fret) => fret + 1).map((fret) => {
        const cx = noteX(fret);
        const cy = stringY(2) + STRING_DY / 2;
        if (fret === DOUBLE_INLAY_FRET) {
          return (
            <g key={fret} className="fill-zinc-300 dark:fill-zinc-700">
              <circle cx={cx} cy={stringY(1) + STRING_DY / 2} r={7} />
              <circle cx={cx} cy={stringY(3) + STRING_DY / 2} r={7} />
            </g>
          );
        }
        if (!INLAY_FRETS.has(fret)) return null;
        return (
          <circle
            key={fret}
            cx={cx}
            cy={cy}
            r={7}
            className="fill-zinc-300 dark:fill-zinc-700"
          />
        );
      })}

      {/* bånd (vertikale linjer) — bånd 0 er gripebrettkanten (tykkere) */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, fret) => (
        <line
          key={fret}
          x1={fretX(fret)}
          y1={stringY(0)}
          x2={fretX(fret)}
          y2={stringY(STRINGS.length - 1)}
          strokeWidth={fret === 0 ? 7 : 2}
          className="stroke-zinc-400 dark:stroke-zinc-500"
        />
      ))}

      {/* strenger (horisontale linjer) — visningsrekkefølge: tynn e øverst */}
      {DISPLAY_ORDER.map((stringIndex, row) => (
        <line
          key={stringIndex}
          x1={fretX(0)}
          y1={stringY(row)}
          x2={fretX(FRET_COUNT)}
          y2={stringY(row)}
          strokeWidth={STRING_THICKNESS[stringIndex]}
          className="stroke-zinc-500 dark:stroke-zinc-400"
        />
      ))}

      {/* båndnumre */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, fret) => (
        <text
          key={fret}
          x={noteX(fret)}
          y={HEIGHT - 10}
          textAnchor="middle"
          className="fill-zinc-400 text-xs dark:fill-zinc-500"
        >
          {fret}
        </text>
      ))}

      {/* noter på alle strenger/bånd — tynn e øverst */}
      {DISPLAY_ORDER.map((stringIndex, row) =>
        Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
          const note = noteAt(stringIndex, fret);
          const interval = chord ? intervalInChord(chord, note) : null;
          const pc = pitchClassOf(note);
          const cx = noteX(fret);
          const cy = stringY(row);

          if (!interval) {
            // vanlig tone — liten, anonym prikk
            return (
              <circle
                key={`${stringIndex}-${fret}`}
                cx={cx}
                cy={cy}
                r={3.5}
                className="cursor-pointer fill-zinc-400/40 hover:fill-zinc-500/70 dark:fill-zinc-500/40"
                onClick={() => onNoteClick(note)}
              >
                <title>{note}</title>
              </circle>
            );
          }

          // akkordtone — farget sirkel med etikett
          const label =
            displayMode === "note"
              ? pc
              : displayMode === "interval"
                ? formatInterval(interval)
                : null;
          return (
            <g
              key={`${stringIndex}-${fret}`}
              className="cursor-pointer hover:opacity-80"
              onClick={() => onNoteClick(note)}
            >
              <title>{`${note} (${formatInterval(interval)})`}</title>
              <circle
                cx={cx}
                cy={cy}
                r={displayMode === "both" ? 15 : 13}
                fill={colorForInterval(interval)}
                stroke="white"
                strokeOpacity={0.7}
                strokeWidth={1.5}
              />
              {label !== null ? (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none fill-white text-xs font-semibold"
                >
                  {label}
                </text>
              ) : (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none fill-white font-semibold"
                >
                  <tspan x={cx} dy={-4} className="text-[10px]">
                    {pc}
                  </tspan>
                  <tspan x={cx} dy={11} className="text-[9px]">
                    {formatInterval(interval)}
                  </tspan>
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
