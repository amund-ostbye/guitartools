import { chordNotesWithOctave } from "@/lib/music";
import type { PolySynth, Synth } from "tone";

let synth: PolySynth<Synth> | null = null;
let clickSynth: Synth | null = null;

// Tone.js lastes dynamisk slik at koden også kan server-renderes uten window.
// start() må kalles fra en brukerhandling pga. nettleserens autoplay-policy.
async function getTone(): Promise<typeof import("tone")> {
  const Tone = await import("tone");
  await Tone.start();
  return Tone;
}

function getSynth(Tone: typeof import("tone")): PolySynth<Synth> {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.volume.value = -6;
  }
  return synth;
}

// Spiller av en enkelt note, f.eks. "F#2"
export async function playNote(note: string): Promise<void> {
  if (!note) return;
  const Tone = await getTone();
  getSynth(Tone).triggerAttackRelease(note, "8n");
}

// Kort klikk som metronom. time (sekunder i lydklokken) brukes når den kalles
// fra en Transport-hendelse, slik at klikket og UI-et går i takt.
export async function playClick(
  accent: boolean,
  time?: number,
): Promise<void> {
  const Tone = await getTone();
  if (!clickSynth) {
    clickSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
    }).toDestination();
    clickSynth.volume.value = -18;
  }
  clickSynth.triggerAttackRelease(accent ? "G6" : "C6", "32n", time);
}

// Strummer en akkord: tonene i lukket posisjon, litt forskjøvet i tid.
export async function playChordStrum(
  symbol: string,
  time?: number,
): Promise<void> {
  const Tone = await getTone();
  const notes = chordNotesWithOctave(symbol);
  if (notes.length === 0) return;
  const s = getSynth(Tone);
  notes.forEach((note, i) => {
    s.triggerAttackRelease(
      note,
      "1n",
      time !== undefined ? time + i * 0.035 : undefined,
    );
  });
}
