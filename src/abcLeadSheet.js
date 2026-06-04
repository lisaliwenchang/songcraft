// Parse an ABC notation string into a lead-sheet structure:
// an array of { syllable, chord } tokens, where `chord` is set only when it
// changes (the chord that became active at that syllable). This lets us render
// chords positioned above the exact words they fall on.
//
// We rely on the structure Claude is asked to produce:
//   - melody lines containing "Chord" markers and notes
//   - one w: line per melody line, with syllables in note order
//
// ABC note detection is intentionally simple — it counts "note events" so we
// can line syllables up with notes the same way an ABC renderer does.

// Matches a single note/rest event head in ABC (accidental? letter octave?).
// We do NOT try to be a full ABC parser; we only need to count note onsets in
// the same order abcjs assigns syllables.
const NOTE_EVENT = /(\[[^\]]*\])|([_^=]?[A-Ga-gz])/g;

// Split an ABC body into pairs of [melodyLine, wLine].
function pairMelodyAndLyrics(abc) {
  const lines = abc.split("\n").map((l) => l.trimEnd());
  const pairs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isHeaderLine(line) || line === "") continue;
    if (line.startsWith("w:")) continue; // handled alongside its melody line
    // This is a melody line; look ahead for its w: line
    let wLine = "";
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].startsWith("w:")) { wLine = lines[j].slice(2).trim(); break; }
      if (!isHeaderLine(lines[j]) && lines[j] !== "" && !lines[j].startsWith("w:")) break;
    }
    pairs.push([line, wLine]);
  }
  return pairs;
}

function isHeaderLine(line) {
  // ABC info fields: a single letter followed by a colon at line start (X: T: M: L: Q: K: etc.)
  return /^[A-Za-z]:/.test(line) && !line.startsWith("w:");
}

// Tokenize a melody line into an ordered list of events:
//   { type: "chord", value: "F" } or { type: "note" }
function tokenizeMelody(line) {
  const events = [];
  // Strip bar lines / repeat marks but keep chords and notes in order.
  // Walk the string, pulling out "..." chord markers and note heads.
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      const end = line.indexOf('"', i + 1);
      if (end === -1) break;
      events.push({ type: "chord", value: line.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    // Try to match a note event at this position
    NOTE_EVENT.lastIndex = i;
    const m = NOTE_EVENT.exec(line);
    if (m && m.index === i) {
      events.push({ type: "note" });
      i = m.index + m[0].length;
      // skip any trailing duration digits / dots / ties
      while (i < line.length && /[0-9/.\->()]/.test(line[i])) i++;
      continue;
    }
    i++;
  }
  return events;
}

// Split a w: lyric line into syllables in note order.
function splitSyllables(wLine) {
  if (!wLine) return [];
  // In ABC, syllables are separated by spaces; hyphens join syllables within a
  // word but each still maps to its own note. We emit one token per syllable,
  // preserving a trailing hyphen so the renderer can show "se-" style joins.
  const out = [];
  for (const word of wLine.split(/\s+/).filter(Boolean)) {
    const parts = word.split("-");
    parts.forEach((p, idx) => {
      if (p === "") return;
      out.push(idx < parts.length - 1 ? p + "-" : p);
    });
  }
  return out;
}

// Produce [{ syllable, chord }] for the whole ABC. `chord` is non-empty only
// when the active chord changes at that syllable.
export function abcToLeadSheet(abc) {
  if (!abc) return [];
  const pairs = pairMelodyAndLyrics(abc);
  const result = [];
  let activeChord = "";

  for (const [melodyLine, wLine] of pairs) {
    const events = tokenizeMelody(melodyLine);
    const syllables = splitSyllables(wLine);
    let pendingChord = activeChord;
    let sylIdx = 0;

    for (const ev of events) {
      if (ev.type === "chord") {
        pendingChord = ev.value;
        continue;
      }
      // ev.type === "note": attach the current syllable (if any)
      const syllable = sylIdx < syllables.length ? syllables[sylIdx] : "";
      sylIdx++;
      const chordChanged = pendingChord !== activeChord;
      if (chordChanged) activeChord = pendingChord;
      // Only record tokens that actually carry a syllable
      if (syllable) {
        result.push({ syllable, chord: chordChanged ? pendingChord : "" });
      } else if (chordChanged) {
        // Chord change on a wordless note — carry it to the next syllable
        // by leaving activeChord updated; nothing pushed.
      }
    }
    // If Claude emitted fewer notes than syllables, don't drop the trailing
    // words — append them under the last active chord so nothing is lost.
    while (sylIdx < syllables.length) {
      result.push({ syllable: syllables[sylIdx], chord: "" });
      sylIdx++;
    }
    result.push({ lineBreak: true });
  }
  return result;
}
