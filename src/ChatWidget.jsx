import React, { useState, useRef, useEffect } from "react";
import { track } from "@vercel/analytics";

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm the SongCraft helper. Ask me how anything works — picking a key, generating a melody, why a section came out empty — or just tell me what you think.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

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
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — something went wrong. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
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
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} style={{
        width: 56, height: 56, borderRadius: "50%", border: "1px solid #e8a04e",
        background: "#e8a04e", color: "#14110f", cursor: "pointer", fontSize: 24,
        boxShadow: "0 8px 24px rgba(0,0,0,.4)", float: "right",
      }} aria-label="Open help chat">
        {open ? "×" : "♪"}
      </button>
    </div>
  );
}
