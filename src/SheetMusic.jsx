import React, { useEffect, useRef } from "react";
import abcjs from "abcjs";

export default function SheetMusic({ abcNotation }) {
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

  if (!abcNotation) return null;

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
      <div
        ref={containerRef}
        className="abc-container"
        style={{
          width: "100%",
          overflowX: "auto",
          background: "#fff",
          borderRadius: 12,
          padding: "12px 8px",
        }}
      />
    </div>
  );
}
