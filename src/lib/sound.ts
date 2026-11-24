import {
  chordNotesWithOctave,
  droneNotesFor,
  fullChordNotes,
} from "@/lib/music";
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

// --- Drone ---
// Holder rot + kvint av den aktive akkorden som en vedvarende tone.
let drone: { synth: PolySynth<Synth>; notes: string[] } | null = null;

// Starter drone for en akkord; slipper samtidig forrige drone på samme tidspunkt.
export async function startDrone(symbol: string, time?: number): Promise<void> {
  const Tone = await getTone();
  if (!drone) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1.5 },
    });
    synth.volume.value = -16;
    const filter = new Tone.Filter(900, "lowpass"); // mykner lyden
    synth.chain(filter, Tone.getDestination());
    drone = { synth, notes: [] };
  }
  const notes = droneNotesFor(symbol);
  if (notes.length === 0) return;
  drone.synth.triggerRelease(drone.notes, time);
  drone.synth.triggerAttack(notes, time);
  drone.notes = notes;
}

// Stopper dronen (f.eks. når progresjonen stoppes).
export async function stopDrone(time?: number): Promise<void> {
  if (!drone || drone.notes.length === 0) return;
  await getTone(); // sikrer at Tone er initialisert
  drone.synth.triggerRelease(drone.notes, time);
  drone.notes = [];
}
