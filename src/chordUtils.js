const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const FLAT_DISPLAY = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);

const DEGREE_SEMITONES = {
  "I": 0, "II": 2, "III": 4, "IV": 5, "V": 7, "VI": 9, "VII": 11,
  "i": 0, "ii": 2, "iii": 4, "iv": 5, "v": 7, "vi": 9, "vii": 11,
};

const DEGREE_PATTERN = /^(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)/;

const KEY_NORMALIZE = { "Bb": "A#" };

export function normalizeKey(key) {
  return KEY_NORMALIZE[key] ?? key;
}

function transposeOne(roman, rootKey) {
  const match = roman.trim().match(DEGREE_PATTERN);
  if (!match) return roman;
  const [, degree, quality] = match;
  const rootIndex = CHROMATIC.indexOf(rootKey);
  const semitones = DEGREE_SEMITONES[degree] ?? 0;
  const noteIndex = (rootIndex + semitones) % 12;
  let noteName = CHROMATIC[noteIndex];
  if (FLAT_KEYS.has(rootKey) && FLAT_DISPLAY[noteName]) noteName = FLAT_DISPLAY[noteName];
  const isMinor = degree === degree.toLowerCase();
  return noteName + (isMinor ? "m" + quality : quality);
}

export function transposeChord(romanNumeral, rootKey) {
  // Handle slash chords like "ii7/V" → transpose both parts
  const slashIdx = romanNumeral.indexOf("/");
  if (slashIdx !== -1) {
    const upper = romanNumeral.slice(0, slashIdx);
    const bass  = romanNumeral.slice(slashIdx + 1);
    return transposeOne(upper, rootKey) + "/" + transposeOne(bass, rootKey);
  }
  return transposeOne(romanNumeral, rootKey);
}

// Accepts either a string "I–IV–V" or an array [{ chord, beats }, ...]
export function transposeProgression(section, rootKey) {
  const normalized = normalizeKey(rootKey);
  if (Array.isArray(section)) {
    // Deduplicate consecutive same-chord entries for display
    const seen = [];
    for (const entry of section) {
      const transposed = transposeChord(entry.chord, normalized);
      if (seen.length === 0 || seen[seen.length - 1] !== transposed) {
        seen.push(transposed);
      }
    }
    return seen;
  }
  return section.split(/[–\-,\s]+/).filter(Boolean).map(r => transposeChord(r, normalized));
}

// Returns array of { chord (transposed), beats } for exact scheduling
export function transposeBeats(section, rootKey) {
  const normalized = normalizeKey(rootKey);
  if (Array.isArray(section)) {
    return section.map(entry => ({
      chord: transposeChord(entry.chord, normalized),
      beats: entry.beats,
    }));
  }
  // String format: assume 4 beats per chord
  return section.split(/[–\-,\s]+/).filter(Boolean).map(r => ({
    chord: transposeChord(r, normalized),
    beats: 4,
  }));
}
