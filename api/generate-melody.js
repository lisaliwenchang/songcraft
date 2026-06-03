// Parse Roman numeral string into an array of chord tokens
function parseRoman(romanString) {
  return romanString.split(/[–\-,\s]+/).filter(Boolean);
}

// Build a bar-by-bar chord map for 8 bars in 4/4.
// The progression cycles evenly: each chord gets (8 / numChords) bars,
// distributed as whole bars. Remainder bars repeat the last chord.
function buildBarChordMap(romanString, transposedChords) {
  const chords = transposedChords;
  const totalBars = 8;
  const n = chords.length;
  const barsPerChord = Math.floor(totalBars / n);
  const remainder = totalBars % n;

  const barMap = []; // barMap[i] = chord name for bar i (0-indexed)
  for (let i = 0; i < n; i++) {
    const bars = barsPerChord + (i === n - 1 ? remainder : 0);
    for (let b = 0; b < bars; b++) barMap.push(chords[i]);
  }
  return barMap; // length === 8
}

// Simple Roman→note transposition (mirrors chordUtils.js — kept inline to avoid ESM issues)
const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_DISPLAY = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);
const DEGREE_SEMITONES = {
  "I":0,"II":2,"III":4,"IV":5,"V":7,"VI":9,"VII":11,
  "i":0,"ii":2,"iii":4,"iv":5,"v":7,"vi":9,"vii":11,
};
const DEGREE_PATTERN = /^(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)/;
const KEY_NORMALIZE = {"Bb":"A#"};

function transposeChord(roman, rootKey) {
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

function transposeProgression(romanString, key) {
  const normalized = KEY_NORMALIZE[key] ?? key;
  return parseRoman(romanString).map(r => transposeChord(r, normalized));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { key, mood, progressionSections, sections } = req.body;

  const results = {};

  for (const section of sections) {
    if (!section.lyrics) continue;

    const sectionRoman = progressionSections?.[section.id] || "I–IV–V–I";
    const transposedChords = transposeProgression(sectionRoman, key);
    const barMap = buildBarChordMap(sectionRoman, transposedChords);

    // Build a human-readable bar-by-bar chord schedule for Claude
    const barSchedule = barMap
      .map((chord, i) => `Bar ${i + 1}: ${chord}`)
      .join(", ");

    const prompt = `You are a music arranger for piano. Write an ABC notation melody for the ${section.label} section (exactly 8 bars, 4/4 time).

Key: ${key}
Style/Mood: ${mood}
Lyrics (${section.label}): ${section.lyrics}

CHORD SCHEDULE — follow this exactly, one chord per bar:
${barSchedule}

Rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no explanation.
- Start with X:1 on the first line.
- Headers: T:${section.label}, M:4/4, L:1/8, Q:1/4=90, K:${key}
- Single melody line only — no harmony voices.
- Match note rhythm to syllable stress in the lyrics.
- Keep it simple and singable for piano.
- Place the chord symbol at the START of the bar it applies to, using ABC syntax: "ChordName"Note. Do NOT place a chord mid-bar unless the chord actually changes mid-bar. Each bar must have exactly one chord symbol at its start.
- Add lyrics below the staff using the w: field. Each syllable maps to one note. Use hyphen - between syllables of the same word, space between words.

Example (4 bars, chord changes every bar):
X:1
T:Verse
M:4/4
L:1/8
Q:1/4=90
K:G
"Am"A2 Bc d2 cB | "C"c4 A2 G2 | "G"B2 cd e2 dc | "Am"A8 |
w: Some-where o-ver the rain-bow`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const abc = data.content.map((i) => i.text || "").join("").replace(/```abc|```/g, "").trim();
    results[section.id] = abc;
  }

  res.status(200).json({ sections: results });
}
