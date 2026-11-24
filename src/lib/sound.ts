import type { PolySynth, Synth } from "tone";

let synth: PolySynth<Synth> | null = null;

// Spiller av en note (f.eks. "F#2"). Må kalles fra en brukerhandling (klikk)
// på grunn av nettleserens autoplay-policy. Tone.js lastes dynamisk slik at
// komponenten også kan server-renderes uten window.
export async function playNote(note: string): Promise<void> {
  if (!note) return;
  const Tone = await import("tone");
  await Tone.start();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.volume.value = -6;
  }
  synth.triggerAttackRelease(note, "8n");
}
