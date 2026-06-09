import React, { useState } from "react";

const wrap = {
  background: "#14110f", color: "#f0e8de", minHeight: "100vh",
  fontFamily: "'Space Mono', monospace", padding: 32, boxSizing: "border-box",
};
const card = {
  background: "#1f1a17", border: "1px solid #3a322b", borderRadius: 12,
  padding: 18, marginBottom: 16,
};
const inputStyle = {
  background: "#14110f", border: "1px solid #3a322b", borderRadius: 8,
  color: "#f0e8de", padding: "10px 12px", fontFamily: "'Space Mono', monospace",
  fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
};
const btn = {
  background: "#e8a04e", color: "#14110f", border: "none", borderRadius: 8,
  padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
  fontFamily: "'Space Mono', monospace",
};

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [escalations, setEscalations] = useState([]);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState({}); // id -> draft text
  const [busy, setBusy] = useState({}); // id -> bool

  const load = async (pw) => {
    setError("");
    try {
      const res = await fetch("/api/escalations", { headers: { "x-admin-password": pw } });
      if (res.status === 401) { setError("Wrong password."); return; }
      const data = await res.json();
      setEscalations(data.escalations || []);
      setAuthed(true);
    } catch (e) {
      setError("Could not load escalations.");
    }
  };

  const sendReply = async (id) => {
    const reply = (replies[id] || "").trim();
    if (!reply) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ id, reply }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reply failed."); return; }
      await load(password); // refresh
      setReplies((r) => ({ ...r, [id]: "" }));
    } catch (e) {
      setError("Reply failed.");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  if (!authed) {
    return (
      <div style={wrap}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#e8a04e" }}>SongCraft Admin</h1>
        <div style={{ maxWidth: 360 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(password); }}
            placeholder="Admin password"
            style={inputStyle}
          />
          <div style={{ marginTop: 12 }}>
            <button style={btn} onClick={() => load(password)}>Unlock</button>
          </div>
          {error && <div style={{ color: "#e87a4e", marginTop: 12, fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    );
  }

  const open = escalations.filter((e) => e.status === "open");
  const answered = escalations.filter((e) => e.status !== "open");

  const renderItem = (e) => (
    <div key={e.id} style={card}>
      <div style={{ fontSize: 11, color: "#a89888", marginBottom: 6 }}>
        #{e.id} · {new Date(e.created_at).toLocaleString()} · {e.user_email} · <b style={{ color: e.status === "open" ? "#e8a04e" : "#7aa84e" }}>{e.status}</b>
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, marginBottom: 8 }}>{e.question}</div>
      {e.history && (
        <details style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: "#a89888" }}>conversation</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#a89888", marginTop: 6 }}>{e.history}</pre>
        </details>
      )}
      {e.status === "open" ? (
        <>
          <textarea
            rows={3}
            value={replies[e.id] || ""}
            onChange={(ev) => setReplies((r) => ({ ...r, [e.id]: ev.target.value }))}
            placeholder="Type your reply — this emails the user…"
            style={{ ...inputStyle, resize: "vertical", marginBottom: 8 }}
          />
          <button style={btn} disabled={busy[e.id]} onClick={() => sendReply(e.id)}>
            {busy[e.id] ? "Sending…" : "Send reply email"}
          </button>
        </>
      ) : (
        <div style={{ fontSize: 13, color: "#a89888" }}>
          <b style={{ color: "#f0e8de" }}>Replied:</b> {e.reply}
        </div>
      )}
    </div>
  );

  return (
    <div style={wrap}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#e8a04e" }}>SongCraft Admin</h1>
      <button style={{ ...btn, marginBottom: 20 }} onClick={() => load(password)}>Refresh</button>
      {error && <div style={{ color: "#e87a4e", marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <h2 style={{ fontSize: 14, color: "#a89888", letterSpacing: "0.1em" }}>OPEN ({open.length})</h2>
      {open.length === 0 && <div style={{ color: "#a89888", fontSize: 13, marginBottom: 20 }}>No open questions.</div>}
      {open.map(renderItem)}

      <h2 style={{ fontSize: 14, color: "#a89888", letterSpacing: "0.1em", marginTop: 24 }}>ANSWERED ({answered.length})</h2>
      {answered.map(renderItem)}
    </div>
  );
}
