import React, { useState } from "react";

// ---------- Data ----------
const PROGRESSIONS = [
  { id: "1564", name: "The Anthem", roman: "I–V–vi–IV", keyC: "C–G–Am–F", vibe: "Uplifting, used in countless pop hits", songs: "Let It Be, Don't Stop Believin'" },
  { id: "4536", name: "Sensitive", roman: "IV–V–iii–vi", keyC: "F–G–Em–Am", vibe: "Emotional, J-pop & ballad staple", songs: "Many anime themes" },
  { id: "6415", name: "The Sad One", roman: "vi–IV–I–V", keyC: "Am–F–C–G", vibe: "Melancholy but hopeful", songs: "Numb, Africa" },
  { id: "1645", name: "Doo-Wop", roman: "I–vi–IV–V", keyC: "C–Am–F–G", vibe: "50s, nostalgic, warm", songs: "Stand By Me" },
  { id: "1545", name: "Folk Drive", roman: "I–V–IV–V", keyC: "C–G–F–G", vibe: "Driving, singalong", songs: "Sweet Home Alabama" },
  { id: "2516", name: "Jazzy", roman: "ii–V–I–vi", keyC: "Dm–G–C–Am", vibe: "Smooth, jazz turnaround", songs: "Autumn Leaves" },
  { id: "1453", name: "Dreamy", roman: "I–IV–V–iii", keyC: "C–F–G–Em", vibe: "Floaty, wistful", songs: "Indie ballads" },
  { id: "canon", name: "The Canon", roman: "I–V–vi–iii–IV–I–IV–V", keyC: "C–G–Am–Em–F–C–F–G", vibe: "Grand, cascading, classical", songs: "Canon in D" },
];

const SECTIONS = [
  { id: "verse", label: "Verse", required: true, hint: "Tells the story, sets the scene" },
  { id: "prechorus", label: "Pre-Chorus", required: false, hint: "Builds tension into the chorus" },
  { id: "chorus", label: "Chorus", required: true, hint: "The hook — the part people remember" },
  { id: "bridge", label: "Bridge", required: false, hint: "A contrast or twist near the end" },
];

const STYLES = [
  { id: "mellow", label: "Mellow", desc: "soft, intimate, slow-burning" },
  { id: "pop", label: "Pop", desc: "catchy, bright, radio-ready" },
  { id: "folk", label: "Folk", desc: "story-driven, acoustic, earnest" },
  { id: "rnb", label: "R&B", desc: "smooth, soulful, groovy" },
  { id: "indie", label: "Indie", desc: "dreamy, introspective, textured" },
  { id: "anthemic", label: "Anthemic", desc: "big, soaring, stadium energy" },
];

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=Space+Mono:wght@400;700&display=swap');
`;

export default function SongCraft() {
  const [progression, setProgression] = useState(null);
  const [activeSections, setActiveSections] = useState(["verse", "chorus"]);
  const [style, setStyle] = useState(null);
  const [lyricsBySection, setLyricsBySection] = useState({});

  const toggleSection = (id, required) => {
    if (required) return;
    setActiveSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const orderedSections = SECTIONS.filter((s) => activeSections.includes(s.id));

  const updateLyric = (sectionId, value) => {
    setLyricsBySection((prev) => ({ ...prev, [sectionId]: value }));
  };

  const Step = ({ n, title, children }) => (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14, color: "var(--accent)",
          border: "1px solid var(--accent)", borderRadius: 999, padding: "2px 12px", flexShrink: 0,
        }}>{n}</span>
        <h2 style={{
          fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 500, margin: 0,
          fontStyle: "italic", letterSpacing: "-0.01em",
        }}>{title}</h2>
      </div>
      {children}
    </section>
  );

  return (
    <div style={{
      "--bg": "#14110f", "--card": "#1f1a17", "--card2": "#28211c",
      "--ink": "#f0e8de", "--muted": "#a89888", "--accent": "#e8a04e", "--line": "#3a322b",
      background: "radial-gradient(circle at 20% 0%, #2a221c 0%, #14110f 55%)",
      color: "var(--ink)", minHeight: "100vh", fontFamily: "'Space Mono', monospace",
      padding: "0 0 80px",
    }}>
      <style>{FONTS}</style>

      {/* Header */}
      <header style={{
        padding: "64px 32px 40px", maxWidth: 780, margin: "0 auto", textAlign: "center",
      }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: "0.35em", color: "var(--accent)", marginBottom: 18 }}>
          ◆ SONGWRITING WORKBENCH ◆
        </div>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontSize: "clamp(48px, 9vw, 88px)", fontWeight: 600,
          margin: "0 0 16px", lineHeight: 0.95, letterSpacing: "-0.03em",
        }}>
          Song<span style={{ fontStyle: "italic", color: "var(--accent)" }}>Craft</span>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 460, margin: "0 auto", lineHeight: 1.6, fontSize: 15 }}>
          Build a song from the ground up. Pick your chords, shape the structure,
          choose a mood, and write.
        </p>
      </header>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "0 32px" }}>
        {/* Step 1: Progression */}
        <Step n="01" title="Pick a chord progression">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {PROGRESSIONS.map((p) => {
              const sel = progression?.id === p.id;
              return (
                <button key={p.id} onClick={() => setProgression(p)} style={{
                  textAlign: "left", cursor: "pointer", padding: "18px 18px 16px",
                  background: sel ? "var(--card2)" : "var(--card)",
                  border: `1px solid ${sel ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 14, transition: "all .2s", color: "var(--ink)",
                  boxShadow: sel ? "0 0 0 3px rgba(232,160,78,.15)" : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 19 }}>{p.name}</span>
                    {sel && <span style={{ color: "var(--accent)" }}>●</span>}
                  </div>
                  <div style={{ fontSize: 15, color: "var(--accent)", marginBottom: 4 }}>{p.roman}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>in C: {p.keyC}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, fontFamily: "'Fraunces', serif" }}>{p.vibe}</div>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 2: Structure */}
        <Step n="02" title="Shape the structure">
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -10, marginBottom: 18 }}>
            Verse and Chorus are the backbone. Toggle the Pre-Chorus and Bridge on or off.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SECTIONS.map((s) => {
              const on = activeSections.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleSection(s.id, s.required)} style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "14px 18px",
                  background: on ? "var(--card2)" : "var(--card)",
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 12, cursor: s.required ? "default" : "pointer",
                  color: "var(--ink)", textAlign: "left", opacity: on ? 1 : 0.6, transition: "all .2s",
                }}>
                  <span style={{
                    width: 38, height: 22, borderRadius: 999, flexShrink: 0,
                    background: on ? "var(--accent)" : "var(--line)", position: "relative", transition: "all .2s",
                  }}>
                    <span style={{
                      position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16,
                      borderRadius: "50%", background: "var(--bg)", transition: "all .2s",
                    }} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontStyle: "italic" }}>{s.label}</span>
                    {s.required && <span style={{ fontSize: 10, color: "var(--accent)", marginLeft: 10, letterSpacing: "0.1em" }}>CORE</span>}
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.hint}</div>
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 3: Style */}
        <Step n="03" title="Choose the mood">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {STYLES.map((s) => {
              const sel = style === s.id;
              return (
                <button key={s.id} onClick={() => setStyle(s.id)} style={{
                  padding: "16px", textAlign: "left", cursor: "pointer",
                  background: sel ? "var(--card2)" : "var(--card)",
                  border: `1px solid ${sel ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 12, color: "var(--ink)", transition: "all .2s",
                }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontStyle: "italic", marginBottom: 4, color: sel ? "var(--accent)" : "var(--ink)" }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 4: Lyrics */}
        <Step n="04" title="Write the lyrics">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orderedSections.map((s) => (
              <div key={s.id} style={{
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontStyle: "italic", color: "var(--accent)" }}>{s.label}</span>
                  {progression && <span style={{ fontSize: 11, color: "var(--muted)" }}>{progression.roman}</span>}
                </div>
                <textarea value={lyricsBySection[s.id] || ""} onChange={(e) => updateLyric(s.id, e.target.value)}
                  placeholder={`Lyrics for the ${s.label.toLowerCase()}…`} rows={4}
                  style={{
                    width: "100%", background: "transparent", border: "none", resize: "vertical",
                    color: "var(--ink)", fontFamily: "'Fraunces', serif", fontSize: 17, lineHeight: 1.7,
                    outline: "none", boxSizing: "border-box",
                  }} />
              </div>
            ))}
          </div>
        </Step>

        {/* Summary footer */}
        <div style={{
          marginTop: 20, padding: "24px", background: "var(--card2)", borderRadius: 16,
          border: "1px solid var(--line)", textAlign: "center",
        }}>
          <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR SONG SO FAR</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, lineHeight: 1.6 }}>
            {progression ? <><span style={{ color: "var(--accent)" }}>{progression.name}</span> ({progression.roman})</> : "no chords yet"}
            {" · "}
            {style ? STYLES.find(s => s.id === style).label : "no style yet"}
            <br />
            <span style={{ fontSize: 14, color: "var(--muted)" }}>{orderedSections.map(s => s.label).join(" → ")}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
