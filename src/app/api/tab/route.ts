import { parseUgPage } from "@/lib/ug";

const UG_HOST = /(^|\.)ultimate-guitar\.com$/i;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// GET /api/tab?url=<ultimate-guitar-url>
// Henter en UG "chords"-side server-side og returnerer tittel, artist og akkorder.
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return Response.json({ error: "Ugyldig URL." }, { status: 400 });
  }
  if (!UG_HOST.test(target.hostname)) {
    return Response.json(
      { error: "Kun ultimate-guitar.com-URLer støttes." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!res.ok) {
      return Response.json(
        { error: `Ultimate Guitar svarte med HTTP ${res.status}.` },
        { status: 502 },
      );
    }
    const tab = parseUgPage(await res.text());
    if (!tab) {
      return Response.json(
        { error: "Fant ingen akkorder på siden — kanskje det er en ren tab?" },
        { status: 422 },
      );
    }
    return Response.json(tab);
  } catch {
    return Response.json(
      { error: "Kunne ikke hente siden fra Ultimate Guitar." },
      { status: 502 },
    );
  }
}
