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
  const errors = {};

  // Process all sections in parallel so we don't exceed the serverless
  // function timeout when generating verse + pre-chorus + chorus + bridge.
  await Promise.all(sections.map(async (section) => {
    if (!section.lyrics) return;

    const sectionData = progressionSections?.[section.id] || "I–IV–V–I";
    const beatSchedule = toBeatSchedule(sectionData, key);
    const totalBeats = beatSchedule.reduce((s, e) => s + e.beats, 0);
    const totalBars = Math.ceil(totalBeats / 4);
    const scheduleText = buildScheduleText(beatSchedule);

    // Map lyric lines to bars so each line spreads across its full bar span.
    // Also count syllables per line so Claude provides enough singable notes.
    const lyricLines = section.lyrics.split("\n").map((l) => l.trim()).filter(Boolean);
    const barsPerLine = Math.max(1, Math.round(totalBars / Math.max(1, lyricLines.length)));
    const countSyllables = (line) =>
      line.split(/\s+/).filter(Boolean).reduce((sum, word) => {
        // each hyphen-separated piece is a syllable; fall back to vowel-group estimate
        const dash = word.split("-").filter(Boolean).length;
        if (dash > 1) return sum + dash;
        const vowels = (word.toLowerCase().match(/[aeiouy]+/g) || []).length;
        return sum + Math.max(1, vowels);
      }, 0);
    let totalSyllables = 0;
    const lineMapping = lyricLines
      .map((line, i) => {
        const startBar = i * barsPerLine + 1;
        const endBar = Math.min(totalBars, startBar + barsPerLine - 1);
        const syl = countSyllables(line);
        totalSyllables += syl;
        return `Bars ${startBar}-${endBar} (~${syl} syllables): "${line}"`;
      })
      .join("\n");

    const profile = resolveStyleProfile(mood);

    // Per-section role so verse / pre-chorus / chorus / bridge contrast instead
    // of converging on one rhythmic skeleton.
    const SECTION_ROLES = {
      verse: "This is the VERSE: more understated and narrative. Keep the melodic range lower and the rhythm closer to natural speech. Save the big moments for the chorus.",
      prechorus: "This is the PRE-CHORUS: it must BUILD tension. Rise in pitch and increase rhythmic momentum compared to the verse, pushing toward the chorus.",
      chorus: "This is the CHORUS: the melodic and rhythmic PEAK. Higher notes, the most memorable/hooky rhythm, the widest leaps. It must feel clearly different from and bigger than the verse.",
      bridge: "This is the BRIDGE: provide CONTRAST. Use a different rhythmic shape or register than the verse and chorus — surprise the listener.",
    };
    const sectionRole = SECTION_ROLES[section.id] || "";

    const prompt = `You are a distinctive melodist writing the ${section.label} of a song in ABC notation: exactly ${totalBars} bars, 4/4 time.

Key: ${key}

SECTION ROLE — this section must have its own identity:
${sectionRole}

MUSICAL STYLE — shape the rhythm and contour to this mood. Do NOT write a generic even-eighth-note melody:
${profile.feel}
Tempo: ${profile.tempo}

CARRY ALL THE LYRICS — THIS OVERRIDES THE STYLE. This section has about ${totalSyllables} syllables. You MUST provide enough singable note onsets for every syllable. Never run out of notes before the words end. If the style calls for long/sparse notes, you may still need more notes than feels minimal — the words come first. Only use melisma (a syllable held over multiple notes) deliberately, not as a way to avoid writing notes.

RHYTHMIC VARIETY IS REQUIRED. A flat stream of equal notes is a failure. Draw from (don't use all every time):
- Dotted rhythms (e.g. A3 B = dotted-quarter + eighth), syncopation, ties across the beat.
- Rests for breathing room — but place them musically, NOT mechanically on the same beat of every bar.
- Pickups into downbeats where natural.
- Vary note lengths so stressed syllables and phrase-ends land on longer notes.
IMPORTANT: do not start every odd bar (or any fixed bar position) with a rest. Vary WHERE rests and long notes fall from phrase to phrase. Avoid a repeating per-bar rhythmic template.

LYRIC-TO-BAR LAYOUT — sing each line across the bars shown (not crammed into one bar):
${lineMapping}

EXACT CHORD SCHEDULE — place each chord symbol where shown (4 beats = 1 bar):
${scheduleText}

Hard rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no commentary.
- First line: X:1
- Headers: T:${section.label}, M:4/4, L:1/8, ${profile.tempo}, K:${key}
- Exactly ${totalBars} bars; every bar totals 4 beats (8 eighth-note units with L:1/8). Non-negotiable.
- Single melody line, no harmony voices.
- Chord symbols in ABC syntax: "ChordName"Note — a 4-beat chord at its bar start, a 2-beat chord mid-bar, a 1-beat chord on its exact beat.
- After each melody line add a w: line. Each note carrying a new syllable gets one syllable; melisma-continuation notes get none. Hyphen - joins syllables within a word; space separates words. The number of syllables in w: must equal the number of sung (non-rest, non-melisma) notes.`;

    // Clean and validate ABC from a raw model response.
    const extractAbc = (data) => {
      if (!data || !Array.isArray(data.content)) return "";
      let text = data.content.map((i) => i.text || "").join("");
      // Strip code fences and any preamble before the X: header.
      text = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
      const xIdx = text.indexOf("X:");
      if (xIdx > 0) text = text.slice(xIdx);
      return text.trim();
    };

    // An ABC is usable only if it has the K: header AND at least one bar of notes.
    const isUsableAbc = (abc) =>
      /\nK:/.test("\n" + abc) && /[A-Ga-g]/.test(abc.split(/\nK:[^\n]*\n/)[1] || "");

    const callClaude = async (temp) => {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          temperature: temp,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data?.error?.message || `Anthropic API ${r.status}`);
      }
      return extractAbc(data);
    };

    try {
      let abc = await callClaude(0.7);
      // Retry once at lower temperature if the first attempt is unusable.
      if (!isUsableAbc(abc)) {
        abc = await callClaude(0.3);
      }
      results[section.id] = abc;
      if (!isUsableAbc(abc)) {
        errors[section.id] = "Model did not return usable notation.";
      }
    } catch (e) {
      errors[section.id] = e.message || "Generation failed.";
    }
  }));

  res.status(200).json({ sections: results, errors });
}
