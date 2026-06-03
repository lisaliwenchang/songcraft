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

export function transposeChord(romanNumeral, rootKey) {
  const match = romanNumeral.trim().match(DEGREE_PATTERN);
  if (!match) return romanNumeral;
  const [, degree, quality] = match;

  const rootIndex = CHROMATIC.indexOf(rootKey);
  const semitones = DEGREE_SEMITONES[degree] ?? 0;
  const noteIndex = (rootIndex + semitones) % 12;
  let noteName = CHROMATIC[noteIndex];

  if (FLAT_KEYS.has(rootKey) && FLAT_DISPLAY[noteName]) {
    noteName = FLAT_DISPLAY[noteName];
  }

  const isMinor = degree === degree.toLowerCase();
  const suffix = isMinor ? "m" + quality : quality;

  return noteName + suffix;
}

export function transposeProgression(romanString, rootKey) {
  const normalized = normalizeKey(rootKey);
  return romanString.split(/[–\-,\s]+/).filter(Boolean).map(r => transposeChord(r, normalized));
}
