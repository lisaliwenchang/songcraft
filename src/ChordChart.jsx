import React from "react";
import { transposeProgression, normalizeKey } from "./chordUtils";

export default function ChordChart({ progression, selectedKey, lyricsBySection, orderedSections }) {
  const chords = transposeProgression(progression.roman, normalizeKey(selectedKey));

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 16 }}>
        CHORD CHART — KEY OF {selectedKey}
      </div>
      {orderedSections.map((section) => {
        const lyrics = lyricsBySection[section.id] || "";
        if (!lyrics) return null;
        const lines = lyrics.split("\n").filter(Boolean);
        return (
          <div key={section.id} style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16,
              color: "var(--accent)", marginBottom: 10,
            }}>
              {section.label}
            </div>
            {lines.map((line, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13,
                  color: "var(--accent)", letterSpacing: "0.05em", marginBottom: 2,
                }}>
                  {chords[i % chords.length]}
                </div>
                <div style={{
                  fontFamily: "'Fraunces', serif", fontSize: 16, color: "var(--ink)", lineHeight: 1.5,
                }}>
                  {line}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
