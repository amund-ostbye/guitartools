"use client";

import { useState } from "react";
import { parseUgContent, parseUgSong, type UgTab } from "@/lib/ug";

type Props = {
  onChordSelect: (symbol: string) => void; // sett akkord på gripebrettet
  onUseProgression: (sequence: string[]) => void; // bruk hele sekvensen i spilleren
};

export default function TabFetcher({ onChordSelect, onUseProgression }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UgTab | null>(null);
  const [paste, setPaste] = useState("");

  const fetchTab = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/tab?url=${encodeURIComponent(url.trim())}`);
      const data = (await res.json()) as UgTab & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  };

  const usePaste = () => {
    const sequence = parseUgContent(paste);
    if (sequence.length === 0) {
      setError("Fant ingen [ch]Akkord[/ch]-markører i teksten.");
      return;
    }
    setError(null);
    setResult({
      title: "Limt inn tekst",
      artist: "",
      chords: [...new Set(sequence)],
      sequence,
      lines: parseUgSong(paste),
    });
  };

  return (
    <section className="flex w-full max-w-5xl flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <label htmlFor="ug-url" className="text-sm font-medium">
        Hent akkorder fra Ultimate Guitar
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="ug-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tabs.ultimate-guitar.com/tab/..."
          className="w-96 max-w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={fetchTab}
          disabled={loading || !url.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {loading ? "Henter…" : "Hent"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <b>{result.title}</b>
            {result.artist && <span> — {result.artist}</span>}
            <span className="text-zinc-500">
              {" "}
              ({result.sequence.length} akkorder, klikk på en for å se den på
              halsen)
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {result.chords.map((c) => (
              <button
                key={c}
                onClick={() => onChordSelect(c)}
                className="rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1 font-mono text-sm transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {c}
              </button>
            ))}
          </div>
          <div>
            <button
              onClick={() => onUseProgression(result.sequence)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Bruk hele progresjonen ({result.sequence.length} akkorder)
            </button>
          </div>
          {/* sangtekst med akkorder over hver linje (klikk på en akkord for å se den på halsen) */}
          <div className="max-h-96 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            {result.lines.map((line, i) =>
              line.type === "section" ? (
                <p
                  key={i}
                  className="mt-3 text-xs font-bold tracking-wide text-zinc-500 uppercase first:mt-0 dark:text-zinc-400"
                >
                  {line.name}
                </p>
              ) : (
                <div key={i} className="font-mono text-sm">
                  <div className="relative h-5">
                    {line.segments.map((s, j) =>
                      s.chord ? (
                        <button
                          key={j}
                          onClick={() => onChordSelect(s.chord ?? "")}
                          className="absolute top-0 cursor-pointer font-bold whitespace-nowrap text-amber-600 hover:underline dark:text-amber-400"
                          style={{ left: `${s.offset}ch` }}
                        >
                          {s.chord}
                        </button>
                      ) : null,
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">
                    {line.segments.map((s) => s.text).join("")}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400">
          Eller lim inn akkordtekst manuelt (f.eks. [ch]Am[/ch] …)
        </summary>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          placeholder={"[Intro]\n[ch]Am[/ch] [ch]F[/ch] [ch]G[/ch] [ch]C[/ch]"}
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={usePaste}
          className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Bruk limt tekst
        </button>
      </details>
    </section>
  );
}
