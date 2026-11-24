// Parser for Ultimate Guitar "chords"-sider.
// Siden inneholder akkordene som en HTML-escaped JSON-streng i en wiki_tab-blokk,
// med akkorder på formatet [ch]Am[/ch].

export type UgTab = {
  title: string;
  artist: string;
  chords: string[]; // unike akkorder i første rekkefølge
  sequence: string[]; // alle akkorder i rekkefølge = progresjonen
  lines: SongLine[]; // sangtekst med akkorder over hver linje
};

export type SongSegment = { chord: string | null; text: string; offset: number };
export type SongLine =
  | { type: "section"; name: string }
  | { type: "lyric"; segments: SongSegment[] };

type Marker = { index: number; chord: string };

// Fjerner alle BBCode-tags fra en linje; [ch]X[/ch] beholdes som markører
// med posisjon (i tegn) i den rensede teksten.
function extractChords(raw: string): { text: string; markers: Marker[] } {
  let text = "";
  const markers: Marker[] = [];
  const re = /\[ch\]([^\]]+)\[\/ch\]|\[\/?[^\]\[]+\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    text += raw.slice(last, m.index);
    if (m[1] !== undefined) markers.push({ index: text.length, chord: m[1].trim() });
    last = m.index + m[0].length;
  }
  text += raw.slice(last);
  return { text, markers };
}

// Deler en tekstlinje i segmenter ved akkordposisjonene
function buildSegments(text: string, markers: Marker[]): SongSegment[] {
  const pts = [0, ...markers.map((m) => Math.min(m.index, text.length)), text.length]
    .sort((a, b) => a - b);
  const uniq = [...new Set(pts)];
  const segs: SongSegment[] = [];
  for (let i = 0; i < uniq.length - 1; i++) {
    const start = uniq[i];
    const end = uniq[i + 1];
    if (end <= start) continue;
    const marker = markers.find((m) => Math.min(m.index, text.length) === start);
    segs.push({ chord: marker?.chord ?? null, text: text.slice(start, end), offset: start });
  }
  return segs;
}

// Parser rå UG-innhold til strukturerte linjer: seksjonsmarkører ([Verse 1])
// og tekstlinjer der hver akkord ligger over riktig posisjon i teksten.
export function parseUgSong(content: string): SongLine[] {
  const lines: SongLine[] = [];
  let pending: Marker[] | null = null; // akkordlinje som venter på sin tekstlinje
  for (const raw of content.split(/\r?\n/)) {
    const withoutTab = raw.replace(/^\[tab\]/i, "");
    const section = withoutTab.trim().match(/^\[([^\]]+)\]$/);
    if (section) {
      lines.push({ type: "section", name: section[1] });
      pending = null;
      continue;
    }
    const { text, markers } = extractChords(withoutTab);
    if (text.trim() === "") {
      if (markers.length > 0) pending = markers; // ren akkordlinje
      continue;
    }
    const useMarkers = markers.length > 0 ? markers : pending ?? [];
    lines.push({ type: "lyric", segments: buildSegments(text, useMarkers) });
    pending = null;
  }
  return lines;
}

// Trekk ut alle [ch]X[/ch]-akkorder fra rå UG-innhold (eller limt tekst)
export function parseUgContent(content: string): string[] {
  return [...content.matchAll(/\[ch\]([^\]]+)\[\/ch\]/g)].map((m) =>
    m[1].trim(),
  );
}

function unescapeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Parser en hel UG-side (HTML) til tittel, artist og akkorder.
// Returnerer null hvis siden ikke inneholder noen wiki_tab/akkorder.
export function parseUgPage(html: string): UgTab | null {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let title = "";
  let artist = "";
  if (titleMatch) {
    const t = titleMatch[1].replace(/\s*@\s*Ultimate-Guitar\.Com\s*$/i, "");
    const byMatch = t.match(/^(.*?)\s+(?:CHORDS?|TABS?)\s+by\s+(.+)$/i);
    if (byMatch) {
      title = byMatch[1].trim();
      artist = byMatch[2].trim();
    } else {
      title = t.trim();
    }
  }

  const unescaped = unescapeHtml(html);
  const contentMatch = unescaped.match(
    /"wiki_tab":\{"content":"((?:\\.|[^"\\])*)"/,
  );
  if (!contentMatch) return null;

  let content: string;
  try {
    content = JSON.parse(`"${contentMatch[1]}"`) as string;
  } catch {
    return null;
  }

  const sequence = parseUgContent(content);
  if (sequence.length === 0) return null;
  return {
    title,
    artist,
    chords: [...new Set(sequence)],
    sequence,
    lines: parseUgSong(content),
  };
}
