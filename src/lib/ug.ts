// Parser for Ultimate Guitar "chords"-sider.
// Siden inneholder akkordene som en HTML-escaped JSON-streng i en wiki_tab-blokk,
// med akkorder på formatet [ch]Am[/ch].

export type UgTab = {
  title: string;
  artist: string;
  chords: string[]; // unike akkorder i første rekkefølge
  sequence: string[]; // alle akkorder i rekkefølge = progresjonen
};

// Trekk ut alle [ch]X[/ch]-akkorder fra rå UG-innhold (eller limt tekst)
export function parseUgContent(content: string): string[] {
  return [...content.matchAll(/\[ch\]([^\]]+)\[\/ch\]/g)].map((m) =>
    m[1].trim(),
  );
}

function unescapeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
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
  return { title, artist, chords: [...new Set(sequence)], sequence };
}
