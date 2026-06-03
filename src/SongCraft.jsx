import React, { useState, useRef, useEffect } from "react";
import ChordChart from "./ChordChart";
import SheetMusic from "./SheetMusic";
import { transposeProgression, normalizeKey } from "./chordUtils";

// ---------- Data ----------
const PROGRESSIONS = [
  // Taylor Swift
  {
    id: "ts-lovestory", artist: "Taylor Swift", song: "Love Story",
    roman: "I–V–vi–IV", vibe: "Bright, romantic, soaring",
    notes: "Main verse & chorus — one of the most singable progressions in pop",
  },
  {
    id: "ts-youbelongwithme", artist: "Taylor Swift", song: "You Belong With Me",
    roman: "I–V–vi–IV", vibe: "Upbeat, hopeful, anthem-like",
    notes: "Same progression as Love Story but faster and more driving",
  },
  {
    id: "ts-cruelSummer", artist: "Taylor Swift", song: "Cruel Summer",
    roman: "vi–IV–I–V", vibe: "Tense, electric, bittersweet",
    notes: "The vi start gives it that restless, longing feeling",
  },
  {
    id: "ts-antihero", artist: "Taylor Swift", song: "Anti-Hero",
    roman: "I–IV–vi–V", vibe: "Confessional, self-aware, wry",
    notes: "Verse uses I–IV; the IV→vi pivot creates the introspective drop",
  },
  {
    id: "ts-blankspace", artist: "Taylor Swift", song: "Blank Space",
    roman: "I–vi–IV–V", vibe: "Sleek, dramatic, theatrical",
    notes: "Classic doo-wop structure — feels both timeless and sharp",
  },
  // Bruno Mars
  {
    id: "bm-justheway", artist: "Bruno Mars", song: "Just The Way You Are",
    roman: "I–vi–IV–I", vibe: "Warm, devoted, intimate",
    notes: "The loop never resolves to V — keeps it endlessly tender",
  },
  {
    id: "bm-marryyou", artist: "Bruno Mars", song: "Marry You",
    roman: "I–IV–I–V", vibe: "Carefree, joyful, spontaneous",
    notes: "Simple and bouncy — the IV bounce is what makes it feel celebratory",
  },
  {
    id: "bm-grenade", artist: "Bruno Mars", song: "Grenade",
    roman: "i–VI–III–VII", vibe: "Dramatic, heartbroken, intense",
    notes: "Minor key — the VI–III–VII descent drives the emotional weight",
  },
  {
    id: "bm-countonme", artist: "Bruno Mars", song: "Count On Me",
    roman: "I–V–vi–IV", vibe: "Sweet, friendly, warm",
    notes: "Gentle fingerpicked feel — same DNA as countless beloved songs",
  },
  {
    id: "bm-thatswhatIlike", artist: "Bruno Mars", song: "That's What I Like",
    roman: "I–IV–I–V", vibe: "Funky, confident, groove-forward",
    notes: "Rhythm and groove carry this more than harmonic complexity",
  },
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

const KEYS = ["C", "G", "D", "A", "E", "F", "Bb"];

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=Space+Mono:wght@400;700&display=swap');
`;

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

export default function SongCraft() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [progression, setProgression] = useState(null);
  const [activeSections, setActiveSections] = useState(["verse", "chorus"]);
  const [style, setStyle] = useState(null);
  const [lyricsBySection, setLyricsBySection] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("");
  const [abcBySection, setAbcBySection] = useState({});
  const [melodyLoading, setMelodyLoading] = useState(false);
  const [melodyError, setMelodyError] = useState("");
  const resultRef = useRef(null);
  const didGenerate = useRef(false);

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

  useEffect(() => {
    if (didGenerate.current) {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
      didGenerate.current = false;
    }
  }, [lyricsBySection]);

  const generateLyrics = async () => {
    setError("");
    if (!style) { setError("Pick a style first so the lyrics match the mood."); return; }
    if (!progression) { setError("Pick a chord progression to anchor the feel."); return; }
    setLoading(true);
    setAbcBySection({});

    const styleObj = STYLES.find((s) => s.id === style);
    const sectionList = orderedSections.map((s) => s.label).join(", ");
    const prompt = `You are a songwriter. Write original song lyrics with these sections: ${sectionList}.
Style: ${styleObj.label} (${styleObj.desc}).
Chord progression mood: ${progression.name} — ${progression.vibe}.
${theme ? `Theme / subject: ${theme}.` : "Pick an evocative, universal theme."}

Rules:
- Return ONLY valid JSON, no markdown, no preamble.
- Shape: {"verse": "line\\nline...", "chorus": "...", ...} using ONLY these keys: ${orderedSections.map(s => `"${s.id}"`).join(", ")}.
- Each section is 2-4 lines, separated by \\n.
- Make the chorus the catchiest, most repeatable part.`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content.map((i) => i.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setLyricsBySection((prev) => ({ ...prev, ...parsed }));
      didGenerate.current = true;
    } catch (e) {
      setError("Couldn't generate lyrics — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const generateMelody = async () => {
    setMelodyError("");
    if (!progression) { setMelodyError("Pick a chord progression first."); return; }
    if (!style) { setMelodyError("Pick a style first."); return; }
    const hasAnyLyrics = orderedSections.some((s) => lyricsBySection[s.id]);
    if (!hasAnyLyrics) { setMelodyError("Add some lyrics first so the melody can follow the rhythm."); return; }
    setMelodyLoading(true);

    const styleObj = STYLES.find((s) => s.id === style);
    const sections = orderedSections
      .filter((s) => lyricsBySection[s.id])
      .map((s) => ({ id: s.id, label: s.label, lyrics: lyricsBySection[s.id] }));

    try {
      const res = await fetch("/api/generate-melody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          mood: `${styleObj.label} (${styleObj.desc})`,
          chordProgression: progression.roman,
          sections,
        }),
      });
      const data = await res.json();
      if (data.sections) {
        setAbcBySection(data.sections);
      } else {
        setMelodyError("Couldn't generate sheet music — try again.");
      }
    } catch (e) {
      setMelodyError("Couldn't generate sheet music — try again.");
    } finally {
      setMelodyLoading(false);
    }
  };

  const hasLyrics = orderedSections.some((s) => lyricsBySection[s.id]);

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
      <header style={{ padding: "64px 32px 40px", maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
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
          Build a song from the ground up. Pick your key, chords, structure, mood, and write.
        </p>
      </header>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "0 32px" }}>

        {/* Step 1: Key */}
        <Step n="01" title="Choose a key">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {KEYS.map((k) => {
              const sel = selectedKey === k;
              return (
                <button key={k} onClick={() => setSelectedKey(k)} style={{
                  padding: "12px 24px", cursor: "pointer",
                  background: sel ? "var(--card2)" : "var(--card)",
                  border: `1px solid ${sel ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 12, color: sel ? "var(--accent)" : "var(--ink)",
                  fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic",
                  transition: "all .2s",
                  boxShadow: sel ? "0 0 0 3px rgba(232,160,78,.15)" : "none",
                }}>
                  {k}
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 2: Progression */}
        <Step n="02" title="Pick a song's chord progression">
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -10, marginBottom: 18 }}>
            Chords shown in your chosen key of <span style={{ color: "var(--accent)" }}>{selectedKey}</span>.
          </p>
          {["Taylor Swift", "Bruno Mars"].map((artist) => (
            <div key={artist} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 12 }}>
                {artist.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PROGRESSIONS.filter((p) => p.artist === artist).map((p) => {
                  const sel = progression?.id === p.id;
                  const chords = transposeProgression(p.roman, normalizeKey(selectedKey));
                  return (
                    <button key={p.id} onClick={() => setProgression(p)} style={{
                      textAlign: "left", cursor: "pointer", padding: "16px 18px",
                      background: sel ? "var(--card2)" : "var(--card)",
                      border: `1px solid ${sel ? "var(--accent)" : "var(--line)"}`,
                      borderRadius: 14, transition: "all .2s", color: "var(--ink)",
                      boxShadow: sel ? "0 0 0 3px rgba(232,160,78,.15)" : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18 }}>{p.song}</span>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 10 }}>{p.roman}</span>
                        </div>
                        {sel && <span style={{ color: "var(--accent)", flexShrink: 0 }}>●</span>}
                      </div>
                      <div style={{ fontSize: 16, color: "var(--accent)", fontFamily: "'Space Mono', monospace", marginBottom: 8, letterSpacing: "0.05em" }}>
                        {chords.join(" – ")}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, fontFamily: "'Fraunces', serif" }}>
                        {p.vibe}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4, fontStyle: "italic" }}>
                        {p.notes}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Step>

        {/* Step 3: Structure */}
        <Step n="03" title="Shape the structure">
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

        {/* Step 4: Style */}
        <Step n="04" title="Choose the mood">
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

        {/* Step 5: Lyrics */}
        <Step n="05" title="Write the lyrics">
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.05em" }}>THEME OR SUBJECT (optional)</label>
            <input value={theme} onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. leaving home, a summer that didn't last, second chances"
              style={{
                width: "100%", marginTop: 8, padding: "12px 16px", background: "var(--card)",
                border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)",
                fontFamily: "'Space Mono', monospace", fontSize: 14, boxSizing: "border-box",
              }} />
          </div>

          <button onClick={generateLyrics} disabled={loading} style={{
            width: "100%", padding: "16px", background: "var(--accent)", color: "#14110f",
            border: "none", borderRadius: 12, cursor: loading ? "wait" : "pointer",
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14,
            letterSpacing: "0.05em", marginBottom: 12, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "WRITING…" : "✦ GENERATE LYRICS WITH AI"}
          </button>
          <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 0, marginBottom: 20 }}>
            Or just write your own in the boxes below.
          </p>

          {error && <div style={{ color: "#e87a4e", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}

          <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

        {/* Step 6: Chord Chart + Sheet Music */}
        {hasLyrics && progression && (
          <Step n="06" title="Your lead sheet">
            <ChordChart
              progression={progression}
              selectedKey={selectedKey}
              lyricsBySection={lyricsBySection}
              orderedSections={orderedSections}
            />

            <div style={{ marginTop: 32 }}>
              <button onClick={generateMelody} disabled={melodyLoading} style={{
                width: "100%", padding: "16px", background: "var(--card2)", color: "var(--accent)",
                border: "1px solid var(--accent)", borderRadius: 12, cursor: melodyLoading ? "wait" : "pointer",
                fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14,
                letterSpacing: "0.05em", opacity: melodyLoading ? 0.7 : 1,
              }}>
                {melodyLoading ? "GENERATING SHEET MUSIC…" : "♩ GENERATE MELODY SHEET MUSIC"}
              </button>
              {melodyError && <div style={{ color: "#e87a4e", fontSize: 13, marginTop: 12, textAlign: "center" }}>{melodyError}</div>}
              <SheetMusic abcBySection={abcBySection} />
            </div>
          </Step>
        )}

        {/* Summary footer */}
        <div style={{
          marginTop: 20, padding: "24px", background: "var(--card2)", borderRadius: 16,
          border: "1px solid var(--line)", textAlign: "center",
        }}>
          <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR SONG SO FAR</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, lineHeight: 1.6 }}>
            <span style={{ color: "var(--accent)" }}>Key of {selectedKey}</span>
            {" · "}
            {progression ? <><span style={{ color: "var(--accent)" }}>{progression.song}</span> ({progression.roman})</> : "no chords yet"}
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
