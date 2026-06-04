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

// Translate a style id (or label substring) into concrete musical direction so
// the mood actually changes the melody instead of being a decorative word.
const STYLE_PROFILES = {
  mellow: {
    tempo: "Q:1/4=72",
    feel: "Mellow ballad. Sparse, breathy phrasing. Long sustained notes (half and dotted-quarter notes), lots of space and rests between phrases. Narrow, low-to-mid range. Almost no syncopation — sit calmly on the beat or slightly behind it.",
  },
  pop: {
    tempo: "Q:1/4=104",
    feel: "Bright radio pop. Catchy, repetitive rhythmic motifs. Mix quarter and eighth notes with the occasional dotted-eighth+sixteenth hook. A pickup note into the downbeat of phrases. Mid range, bouncy but clean.",
  },
  folk: {
    tempo: "Q:1/4=92",
    feel: "Earnest acoustic folk. Conversational, speech-like rhythm that follows the words. Use pickups and gentle dotted rhythms. Mostly stepwise motion. Leave breathing rests at line ends.",
  },
  rnb: {
    tempo: "Q:1/4=84",
    feel: "Smooth R&B/soul. Heavily syncopated — push notes off the beat, tie across beats, land on the 'and' of beats. Use melisma (one syllable sung over 2-3 notes) on key words. Sixteenth-note runs and grace-note slides. Sits in a relaxed groove.",
  },
  indie: {
    tempo: "Q:1/4=96",
    feel: "Dreamy indie. Unexpected note choices, occasional wide leaps, off-kilter phrasing that doesn't always resolve on the downbeat. Mix of syncopation and held notes. A little rhythmically unpredictable.",
  },
  anthemic: {
    tempo: "Q:1/4=120",
    feel: "Big stadium anthem. Strong, punchy downbeats. Rising melodic contour toward a high sustained note at phrase peaks. Driving eighth notes with dotted-quarter accents. Wide range, climbs as the phrase builds.",
  },
};

function resolveStyleProfile(mood) {
  const m = (mood || "").toLowerCase();
  for (const key of Object.keys(STYLE_PROFILES)) {
    if (m.includes(key) || (key === "rnb" && m.includes("r&b"))) return STYLE_PROFILES[key];
  }
  return { tempo: "Q:1/4=96", feel: `Style: ${mood}. Use rhythmic variety appropriate to this mood.` };
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

    const profile = resolveStyleProfile(mood);

    const prompt = `You are a distinctive melodist writing a ${section.label} for a song. Write it in ABC notation, exactly ${totalBars} bars in 4/4 time.

Key: ${key}

MUSICAL STYLE — this must shape the rhythm and contour. Do NOT write a generic even-eighth-note melody:
${profile.feel}
Tempo: ${profile.tempo}

RHYTHMIC VARIETY IS REQUIRED. A flat stream of equal notes is a failure. Use a mix of:
- Dotted rhythms (e.g. A3 B for a dotted-quarter + eighth), syncopation, and notes tied across the beat.
- Rests for breathing room between phrases (z, z2).
- Pickups (anacrusis) leading into strong downbeats.
- Melisma where it fits the style: hold one syllable across 2-3 notes by joining them with no new syllable in the w: line (use * or extend with a hyphen-less continuation).
- Vary note lengths so stressed syllables and phrase-ends land on longer notes.

LYRIC-TO-BAR LAYOUT — sing each lyric line across the bars shown (not crammed into one bar):
${lineMapping}

EXACT CHORD SCHEDULE — place each chord symbol where shown (4 beats = 1 bar):
${scheduleText}

Hard rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no commentary.
- First line: X:1
- Headers: T:${section.label}, M:4/4, L:1/8, ${profile.tempo}, K:${key}
- Exactly ${totalBars} bars; every bar totals 4 beats (8 eighth-note units with L:1/8). This is non-negotiable even while using varied rhythms.
- Single melody line, no harmony voices.
- Place chord symbols in ABC syntax: "ChordName"Note — a 4-beat chord at its bar start, a 2-beat chord mid-bar, a 1-beat chord on its exact beat.
- After each melody line, add a w: line. Each note that carries a new syllable gets one syllable; notes continuing a melisma get no syllable. Hyphen - joins syllables within a word, space separates words.

Example showing dotted rhythm, a rest, a pickup, and melisma (R&B feel):
X:1
T:Verse
M:4/4
L:1/8
Q:1/4=84
K:F
"F"z A3 c2 A2 | "F"G3 F E2 D2 | "Gm7"d4 c2 BA | "Gm7"A6 z2 |
w: Packed my bags at se-ven-teen dreams big-ger than this scene`;

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
        temperature: 1,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const abc = data.content.map((i) => i.text || "").join("").replace(/```abc|```/g, "").trim();
    results[section.id] = abc;
  }

  res.status(200).json({ sections: results });
}
