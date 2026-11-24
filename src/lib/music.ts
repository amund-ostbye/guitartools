import { Chord, Interval, Note } from "tonal";

// Standard stemming på gitar: index 0 = tykk E (lavest), index 5 = tynn e (høyest)
export const STRINGS: string[] = ["E2", "B2", "G3", "D3", "A3", "E4"];
export const FRET_COUNT = 15;

export type ChordInfo = {
  symbol: string; // f.eks. "Bm"
  root: string; // f.eks. "B"
  notes: string[]; // akkordtonene uten oktav, f.eks. ["B", "D", "F#"]
  intervals: string[]; // intervallene relativt rot, f.eks. ["1P", "3m", "5P"]
  quality: string; // "Major" | "Minor" | ...
};

// Parser en akkordsymbol (f.eks. "D", "Bm", "F#maj7") — null hvis ugyldig
export function getChord(input: string): ChordInfo | null {
  const chord = Chord.get(input.trim());
  if (chord.empty || chord.notes.length === 0) return null;
  return {
    symbol: chord.name || input.trim(),
    root: chord.root ?? "",
    notes: chord.notes,
    intervals: chord.intervals,
    quality: chord.quality ?? "",
  };
}

// Noten (med oktav) på en streng ved et gitt bånd, f.eks. noteAt(0, 2) = "F#2"
export function noteAt(stringIndex: number, fret: number): string {
  return (
    Note.transpose(STRINGS[stringIndex], Interval.fromSemitones(fret)) ?? ""
  );
}

// Pitch class uten oktav, f.eks. "F#"
export function pitchClassOf(note: string): string {
  return Note.pitchClass(note) ?? "";
}

// Hvis noten er en akkordtone: intervallstrengen relativt rot (f.eks. "3m"), ellers null
export function intervalInChord(
  chord: ChordInfo,
  note: string,
): string | null {
  const pc = pitchClassOf(note);
  const index = chord.notes.findIndex((n) => pitchClassOf(n) === pc);
  return index >= 0 ? chord.intervals[index] : null;
}

// Kort, lesbar visning av intervall: "1P" -> "1", "3M" -> "3", "m3" -> "♭3", "5P" -> "5"
export function formatInterval(interval: string): string {
  const num = Interval.num(interval) ?? "?";
  const letters = (interval.match(/[PMmAd]+/g) ?? []).join("");
  const symbols = letters
    .replace(/m/g, "♭")
    .replace(/d/g, "♭♭")
    .replace(/A/g, "#")
    .replace(/[PM]/g, "");
  return `${symbols}${num}`;
}

// Akkordtoner med oktav i lukket posisjon rundt 3. oktav,
// f.eks. "Bm" -> ["B3", "D4", "F#4"]. Brukes til å spille akkorden.
export function chordNotesWithOctave(symbol: string): string[] {
  const chord = Chord.get(symbol);
  if (chord.empty || chord.notes.length === 0 || !chord.root) return [];
  const notes: string[] = [];
  let prevMidi = (Note.midi(`${chord.root}2`) ?? 40) + 11; // like under roten i 3. oktav
  for (const pc of chord.notes) {
    let midi = Note.midi(`${pc}3`) ?? 48;
    while (midi <= prevMidi) midi += 12; // alltid stigende rekkefølge
    const withOctave = Note.fromMidi(midi);
    if (withOctave) notes.push(withOctave);
    prevMidi = midi;
  }
  return notes;
}

// Drone-toner: rot og kvint over 2. oktav, f.eks. "D" -> ["D2", "A2"]
export function droneNotesFor(symbol: string): string[] {
  const chord = Chord.get(symbol);
  if (chord.empty || !chord.root) return [];
  const rootMidi = Note.midi(`${chord.root}2`);
  if (rootMidi === null) return [];
  const fifthMidi = rootMidi + 7; // ren kvint over rot
  return [Note.fromMidi(rootMidi), Note.fromMidi(fifthMidi)].filter(
    (n): n is string => n !== null,
  );
}

// Norsk navn på akkordkvalitet, f.eks. "Major" -> "dur"
export function qualityLabel(quality: string): string {
  if (quality === "Major") return "dur";
  if (quality === "Minor") return "moll";
  return quality.toLowerCase();
}

// Farge per intervall: rot = rød, ters = blå, kvint = gul, øvrige = lilla
export function colorForInterval(interval: string): string {
  switch (Interval.num(interval)) {
    case 1:
      return "#ef4444";
    case 3:
      return "#3b82f6";
    case 5:
      return "#f59e0b";
    default:
      return "#a855f7";
  }
}
