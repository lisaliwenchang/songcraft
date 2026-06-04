import React from "react";
import { abcToLeadSheet } from "./abcLeadSheet";

// Render an honest chord-over-lyrics lead sheet derived from the ABC that
// the sheet-music step produced. Chords sit directly above the word they
// fall on, and only appear when the chord changes.
function LeadSheetLines({ tokens }) {
  // Group tokens into lines (split on lineBreak markers)
  const lines = [];
  let current = [];
  for (const t of tokens) {
    if (t.lineBreak) {
      if (current.length) lines.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length) lines.push(current);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 2 }}>
          {line.map((tok, ti) => (
            <span key={ti} style={{ display: "inline-flex", flexDirection: "column", marginRight: 6 }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 12, color: "var(--accent)",
                height: 16, letterSpacing: "0.03em",
              }}>
                {tok.chord || " "}
              </span>
              <span style={{
                fontFamily: "'Fraunces', serif", fontSize: 17, color: "var(--ink)", lineHeight: 1.4,
              }}>
                {tok.syllable}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ChordChart({ abcBySection, orderedSections }) {
  const sectionsWithAbc = orderedSections.filter((s) => abcBySection[s.id]);
  if (sectionsWithAbc.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 16 }}>
        LEAD SHEET — CHORDS OVER LYRICS
      </div>
      {sectionsWithAbc.map((section) => {
        const tokens = abcToLeadSheet(abcBySection[section.id]);
        return (
          <div key={section.id} style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16,
              color: "var(--accent)", marginBottom: 10,
            }}>
              {section.label}
            </div>
            <LeadSheetLines tokens={tokens} />
          </div>
        );
      })}
    </div>
  );
}
