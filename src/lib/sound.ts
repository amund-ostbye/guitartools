import { chordNotesWithOctave, fullChordNotes } from "@/lib/music";
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

// Strummer en akkord litt forskjøvet i tid.
// voicing "triad" = lukket posisjon rundt 3. oktav, "full" = 6 toner à la gitar.
export async function playChordStrum(
  symbol: string,
  time?: number,
  voicing: "triad" | "full" = "triad",
): Promise<void> {
  const Tone = await getTone();
  const notes =
    voicing === "full"
      ? fullChordNotes(symbol)
      : chordNotesWithOctave(symbol);
  if (notes.length === 0) return;
  const s = getSynth(Tone);
  const stagger = voicing === "full" ? 0.045 : 0.035;
  const duration = voicing === "full" ? "2n" : "1n";
  notes.forEach((note, i) => {
    s.triggerAttackRelease(
      note,
      duration,
      time !== undefined ? time + i * stagger : undefined,
    );
  });
}

// --- Vedvarende bakgrunnslyd (drone / akkord med sustain) ---
let pad: { synth: PolySynth<Synth>; notes: string[] } | null = null;

async function getPad(Tone: typeof import("tone")) {
  if (!pad) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1.5 },
    });
    synth.volume.value = -16;
    const filter = new Tone.Filter(900, "lowpass"); // mykner lyden
    synth.chain(filter, Tone.getDestination());
    pad = { synth, notes: [] };
  }
  return pad;
}

// Holder en liste toner som vedvarende lyd; slipper forrige på samme tidspunkt.
async function sustainNotes(notes: string[], time?: number): Promise<void> {
  if (notes.length === 0) return;
  const Tone = await getTone();
  const p = await getPad(Tone);
  p.synth.triggerRelease(p.notes, time);
  p.synth.triggerAttack(notes, time);
  p.notes = notes;
}

// Starter en vedvarende bakgrunnslyd med gitte toner
// (f.eks. drone = rot+kvint, og/eller hele akkorden med sustain).
export async function startPad(notes: string[], time?: number): Promise<void> {
  await sustainNotes(notes, time);
}

// Stopper bakgrunnslyden (f.eks. når progresjonen stoppes).
export async function stopPad(time?: number): Promise<void> {
  if (!pad || pad.notes.length === 0) return;
  await getTone(); // sikrer at Tone er initialisert
  pad.synth.triggerRelease(pad.notes, time);
  pad.notes = [];
}
