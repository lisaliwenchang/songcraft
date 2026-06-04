import React, { useEffect, useRef, useState } from "react";
import abcjs from "abcjs";

function StaffBlock({ label, abcNotation }) {
  const containerRef = useRef(null);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    if (!abcNotation || !containerRef.current) return;
    containerRef.current.innerHTML = "";
    setRenderError("");
    try {
      const result = abcjs.renderAbc(containerRef.current, abcNotation, {
        responsive: "resize",
        add_classes: true,
        paddingtop: 10,
        paddingbottom: 10,
        paddingright: 20,
        paddingleft: 20,
      });
      // abcjs returns parsed tunes; if nothing rendered, flag it.
      const hasStaff = containerRef.current.querySelector("svg path, svg .abcjs-note");
      if (!hasStaff) setRenderError("Notation could not be drawn (abcjs produced no staff).");
    } catch (e) {
      setRenderError("Render error: " + (e?.message || "unknown"));
    }
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
      {renderError && (
        <details style={{ marginTop: 8, fontSize: 11, color: "#e87a4e" }}>
          <summary style={{ cursor: "pointer" }}>{renderError} — show raw notation</summary>
          <pre style={{
            whiteSpace: "pre-wrap", color: "var(--muted)", fontSize: 11,
            background: "var(--card)", padding: 10, borderRadius: 8, marginTop: 6,
          }}>{abcNotation}</pre>
        </details>
      )}
    </div>
  );
}

export default function SheetMusic({ abcBySection, errorsBySection, orderedSections }) {
  // Show one block per ordered section so empty/failed ones are visible too.
  const list = (orderedSections && orderedSections.length
    ? orderedSections.map((s) => [s.id, s.label])
    : Object.keys(abcBySection || {}).map((id) => [id, id.charAt(0).toUpperCase() + id.slice(1)]));

  const anyContent = list.some(([id]) => abcBySection?.[id]);
  if (!anyContent && !(errorsBySection && Object.keys(errorsBySection).length)) return null;

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
      {list.map(([sectionId, label]) => {
        const abc = abcBySection?.[sectionId];
        const err = errorsBySection?.[sectionId];
        if (!abc) {
          return (
            <div key={sectionId} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16, color: "var(--accent)", marginBottom: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: "#e87a4e", background: "var(--card)", padding: 12, borderRadius: 8 }}>
                {err || "No notation returned for this section."}
              </div>
            </div>
          );
        }
        return <StaffBlock key={sectionId} label={label} abcNotation={abc} />;
      })}
    </div>
  );
}
