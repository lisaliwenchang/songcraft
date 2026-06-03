import React, { useEffect, useRef } from "react";
import abcjs from "abcjs";

function StaffBlock({ label, abcNotation }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!abcNotation || !containerRef.current) return;
    containerRef.current.innerHTML = "";
    abcjs.renderAbc(containerRef.current, abcNotation, {
      responsive: "resize",
      add_classes: true,
      paddingtop: 10,
      paddingbottom: 10,
      paddingright: 20,
      paddingleft: 20,
    });
  }, [abcNotation]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16,
        color: "var(--accent)", marginBottom: 8,
      }}>
        {label}
      </div>
      <div
        ref={containerRef}
        className="abc-container"
        style={{ width: "100%", overflowX: "auto", background: "#fff", borderRadius: 12, padding: "12px 8px" }}
      />
    </div>
  );
}

export default function SheetMusic({ abcBySection }) {
  const entries = Object.entries(abcBySection || {}).filter(([, abc]) => abc);
  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 16 }}>
        MELODY — SHEET MUSIC
      </div>
      <style>{`
        .abc-container svg path,
        .abc-container svg rect,
        .abc-container svg ellipse,
        .abc-container svg polygon,
        .abc-container svg line,
        .abc-container svg text {
          fill: #111 !important;
          stroke: #111 !important;
        }
        .abc-container svg text {
          stroke: none !important;
        }
      `}</style>
      {entries.map(([sectionId, abc]) => (
        <StaffBlock
          key={sectionId}
          label={sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}
          abcNotation={abc}
        />
      ))}
    </div>
  );
}
