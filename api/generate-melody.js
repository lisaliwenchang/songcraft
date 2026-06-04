// Inline transposition (mirrors chordUtils.js — kept inline to avoid ESM import issues in Vercel)
const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_DISPLAY = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);
const DEGREE_SEMITONES = {
  "I":0,"II":2,"III":4,"IV":5,"V":7,"VI":9,"VII":11,
  "i":0,"ii":2,"iii":4,"iv":5,"v":7,"vi":9,"vii":11,
};
const DEGREE_PATTERN = /^(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)/;
const KEY_NORMALIZE = {"Bb":"A#"};

function transposeOne(roman, rootKey) {
  const match = roman.trim().match(DEGREE_PATTERN);
  if (!match) return roman;
  const [, degree, quality] = match;
  const rootIndex = CHROMATIC.indexOf(rootKey);
  const noteIndex = (rootIndex + (DEGREE_SEMITONES[degree] ?? 0)) % 12;
  let note = CHROMATIC[noteIndex];
  if (FLAT_KEYS.has(rootKey) && FLAT_DISPLAY[note]) note = FLAT_DISPLAY[note];
  const isMinor = degree === degree.toLowerCase();
  return note + (isMinor ? "m" + quality : quality);
}

function transposeChord(roman, rootKey) {
  const slashIdx = roman.indexOf("/");
  if (slashIdx !== -1) {
    return transposeOne(roman.slice(0, slashIdx), rootKey) + "/" + transposeOne(roman.slice(slashIdx + 1), rootKey);
  }
  return transposeOne(roman, rootKey);
}

// Returns [{ chord, beats }] from either array or string format
function toBeatSchedule(section, key) {
  const normalized = KEY_NORMALIZE[key] ?? key;
  if (Array.isArray(section)) {
    return section.map(e => ({ chord: transposeChord(e.chord, normalized), beats: e.beats }));
  }
  // String format: assume 4 beats per chord
  return section.split(/[–\-,\s]+/).filter(Boolean).map(r => ({
    chord: transposeChord(r, normalized),
    beats: 4,
  }));
}

// Build human-readable beat-by-beat schedule string for Claude
function buildScheduleText(beatSchedule) {
  let beat = 1;
  const lines = [];
  for (const entry of beatSchedule) {
    lines.push(`Beat ${beat}–${beat + entry.beats - 1}: ${entry.chord}`);
    beat += entry.beats;
  }
  return lines.join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { key, mood, progressionSections, sections } = req.body;

  const results = {};

  for (const section of sections) {
    if (!section.lyrics) continue;

    const sectionData = progressionSections?.[section.id] || "I–IV–V–I";
    const beatSchedule = toBeatSchedule(sectionData, key);
    const totalBeats = beatSchedule.reduce((s, e) => s + e.beats, 0);
    const totalBars = Math.ceil(totalBeats / 4);
    const scheduleText = buildScheduleText(beatSchedule);

    // Map lyric lines to bars so each line spreads across its full bar span
    const lyricLines = section.lyrics.split("\n").map((l) => l.trim()).filter(Boolean);
    const barsPerLine = Math.max(1, Math.round(totalBars / Math.max(1, lyricLines.length)));
    const lineMapping = lyricLines
      .map((line, i) => {
        const startBar = i * barsPerLine + 1;
        const endBar = Math.min(totalBars, startBar + barsPerLine - 1);
        return `Bars ${startBar}-${endBar}: "${line}"`;
      })
      .join("\n");

    const prompt = `You are a music arranger for piano. Write an ABC notation melody for the ${section.label} section (exactly ${totalBars} bars, 4/4 time).

Key: ${key}
Style/Mood: ${mood}

LYRIC-TO-BAR LAYOUT — each lyric line must be sung across the bars shown, NOT crammed into one bar. Spread the syllables of each line evenly across its full bar span:
${lineMapping}

EXACT CHORD SCHEDULE — place each chord symbol precisely where shown, counted in beats (4 beats = 1 bar):
${scheduleText}

Rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no explanation.
- Start with X:1 on the first line.
- Headers: T:${section.label}, M:4/4, L:1/8, Q:1/4=90, K:${key}
- The melody MUST be exactly ${totalBars} bars. Each bar holds exactly 4 beats (e.g. with L:1/8, eight eighth-notes or the rhythmic equivalent per bar).
- Single melody line only — no harmony voices.
- A lyric line spanning N bars must have its syllables distributed across all N bars. Do not finish a whole line inside a single bar and leave the next bar wordless.
- Match note rhythm to natural syllable stress; use longer notes on stressed syllables and at phrase ends.
- Place chord symbols in ABC syntax exactly where the chord schedule says: "ChordName"Note. A 4-beat chord gets one symbol at the start of its bar; a 2-beat chord gets its symbol mid-bar; a 1-beat chord gets its symbol on that exact beat.
- Add lyrics below the staff using w: lines. Put one w: line immediately after each melody line of bars. Each syllable maps to one note. Use hyphen - between syllables of the same word, space between words.

Example (one lyric line "Packed my bags at seven-teen" spread across 2 bars of F):
X:1
T:Verse
M:4/4
L:1/8
Q:1/4=90
K:F
"F"F2 F2 A2 A2 | "F"c2 c2 c4 |
w: Packed my bags at se-ven-teen`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const abc = data.content.map((i) => i.text || "").join("").replace(/```abc|```/g, "").trim();
    results[section.id] = abc;
  }

  res.status(200).json({ sections: results });
}
