import React, { useState, useRef, useEffect } from "react";
import { track } from "@vercel/analytics";

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm the SongCraft helper. Ask me how anything works — picking a key, generating a melody, why a section came out empty — or just tell me what you think.",
};

const TICKETS_KEY = "songcraft_tickets"; // open ticket ids awaiting a reply

function loadTickets() {
  try { return JSON.parse(localStorage.getItem(TICKETS_KEY) || "[]"); }
  catch { return []; }
}
function saveTickets(ids) {
  try { localStorage.setItem(TICKETS_KEY, JSON.stringify(ids)); } catch {}
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false); // showing the email capture
  const [email, setEmail] = useState("");
  const [escalateQuestion, setEscalateQuestion] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, escalating]);

  // When the chat opens, check any pending tickets for replies from the owner.
  useEffect(() => {
    if (!open) return;
    const tickets = loadTickets();
    if (tickets.length === 0) return;
    let cancelled = false;
    (async () => {
      const stillOpen = [];
      const replies = [];
      for (const t of tickets) {
        try {
          const res = await fetch(`/api/escalations?ticket=${encodeURIComponent(t)}`);
          if (!res.ok) { stillOpen.push(t); continue; }
          const data = await res.json();
          if (data.status === "answered" && data.reply) replies.push(data.reply);
          else stillOpen.push(t);
        } catch { stillOpen.push(t); }
      }
      if (cancelled) return;
      if (replies.length > 0) {
        setMessages((prev) => [
          ...prev,
          ...replies.map((r) => ({ role: "assistant", content: `↩ Reply from the team:\n\n${r}` })),
        ]);
        saveTickets(stillOpen);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    track("chat_message");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry — I couldn't answer that right now. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (data.escalate) {
        // Remember the question that triggered escalation; show email capture.
        setEscalateQuestion(text);
        setEscalating(true);
        track("chat_escalation_offered");
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — something went wrong. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitEscalation = async () => {
    const addr = email.trim();
    // Email is optional, but if provided it must look valid.
    if (addr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return;
    const history = messages
      .filter((m) => m !== GREETING)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    try {
      const res = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: addr || null, question: escalateQuestion, history }),
      });
      const data = await res.json();
      if (data.ticketId) {
        // Remember this ticket so we can show the reply when they return.
        saveTickets([...loadTickets(), data.ticketId]);
      }
      track("chat_escalation_submitted");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Thanks — your question's been sent to the team. Reopen this chat later and I'll show you the reply right here." +
            (addr ? " We may also reach you by email." : ""),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — couldn't save that. Please try again." },
      ]);
    } finally {
      setEscalating(false);
      setEmail("");
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, fontFamily: "'Space Mono', monospace" }}>
      {open && (
        <div style={{
          width: 340, maxWidth: "calc(100vw - 48px)", height: 460, maxHeight: "calc(100vh - 120px)",
          background: "#1f1a17", border: "1px solid #3a322b", borderRadius: 16,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,.5)", marginBottom: 12,
        }}>
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid #3a322b",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 17, color: "#e8a04e" }}>
              SongCraft Helper
            </span>
            <button onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: "#a89888", cursor: "pointer", fontSize: 18, lineHeight: 1,
            }}>×</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "10px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                background: m.role === "user" ? "#e8a04e" : "#28211c",
                color: m.role === "user" ? "#14110f" : "#f0e8de",
                whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "#a89888", fontSize: 13, padding: "10px 12px" }}>
                typing…
              </div>
            )}
          </div>

          {escalating ? (
            <div style={{ padding: 12, borderTop: "1px solid #3a322b" }}>
              <div style={{ fontSize: 11, color: "#a89888", marginBottom: 8 }}>
                Reopen this chat later to see the reply here. Email is optional (for a heads-up):
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitEscalation(); }}
                  placeholder="you@example.com (optional)"
                  style={{
                    flex: 1, background: "#14110f", border: "1px solid #3a322b", borderRadius: 10,
                    color: "#f0e8de", padding: "10px 12px", fontFamily: "'Space Mono', monospace", fontSize: 13,
                    outline: "none",
                  }}
                />
                <button onClick={submitEscalation} style={{
                  background: "#e8a04e", color: "#14110f", border: "none", borderRadius: 10,
                  padding: "0 14px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                }}>Send</button>
              </div>
              <button onClick={() => setEscalating(false)} style={{
                background: "none", border: "none", color: "#a89888", fontSize: 11,
                cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "'Space Mono', monospace",
              }}>No thanks</button>
            </div>
          ) : (
            <div style={{ padding: 12, borderTop: "1px solid #3a322b", display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                style={{
                  flex: 1, background: "#14110f", border: "1px solid #3a322b", borderRadius: 10,
                  color: "#f0e8de", padding: "10px 12px", fontFamily: "'Space Mono', monospace", fontSize: 13,
                  outline: "none",
                }}
              />
              <button onClick={send} disabled={loading} style={{
                background: "#e8a04e", color: "#14110f", border: "none", borderRadius: 10,
                padding: "0 14px", cursor: loading ? "wait" : "pointer", fontWeight: 700, fontSize: 13,
              }}>→</button>
            </div>
          )}
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} style={{
        display: "flex", alignItems: "center", gap: 8, float: "right",
        height: 48, padding: open ? "0 16px" : "0 18px", borderRadius: 999,
        border: "1px solid #e8a04e", background: "#e8a04e", color: "#14110f",
        cursor: "pointer", fontSize: 14, fontWeight: 700,
        fontFamily: "'Space Mono', monospace", letterSpacing: "0.03em",
        boxShadow: "0 8px 24px rgba(0,0,0,.4)",
      }} aria-label={open ? "Close help chat" : "Open help chat"}>
        {open ? "✕ Close" : "💬 Need help?"}
      </button>
    </div>
  );
}
