// SongCraft help assistant. Answers questions about how the app works and
// captures complaints/feedback to the Vercel function logs.

const SYSTEM_PROMPT = `You are the friendly help assistant for SongCraft, a songwriting web app. Be concise, warm, and practical. Only help with SongCraft and general songwriting questions — politely decline unrelated topics.

HOW SONGCRAFT WORKS (use this to answer questions accurately):
- Step 1: Choose a key (C, G, D, A, E, F, or Bb). All chords update to that key.
- Step 2: Pick a song's chord progression. Each song (e.g. Shake It Off, I Just Might) has its own progression per section (verse, pre-chorus, chorus, bridge), shown in the chosen key.
- Step 3: Shape the structure — Verse and Chorus are required ("CORE"); Pre-Chorus and Bridge are optional toggles.
- Step 4: Choose the mood/style (Mellow, Pop, Folk, R&B, Indie, Anthemic). This changes the melody's rhythm and tempo.
- Step 5: Write lyrics yourself, or click "Generate Lyrics with AI" (uses Claude). You can edit any lyrics afterward.
- Step 6: Click "Generate Melody & Lead Sheet". This produces sheet music (a melody staff with chords and lyrics) plus a chord-over-lyrics lead sheet. It generates a melody for each section that has lyrics.

COMMON ISSUES AND ANSWERS:
- "Why is a section empty / melody didn't generate?": The AI occasionally returns notation that can't render. Tell them to click "Generate" again — regenerating almost always fixes it. Each section is generated independently.
- "Why does it sound generic / same every time?": Suggest trying a different mood in Step 4 (Mellow vs Anthemic sound very different), and note that regenerating gives a fresh take.
- "Can it make audio / a real recording?": No — SongCraft creates readable sheet music and chord charts for musicians to play themselves, not audio. (It is not like Suno.)
- "Can I download it?": Not yet — they can screenshot the sheet music for now.

RULES:
- Keep answers to 2-4 sentences unless they ask for detail.
- If you don't know or it's outside SongCraft, say so honestly.
- Never make up features that don't exist above.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body; // [{ role: "user"|"assistant", content }]
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages" });
  }

  // Capture the latest user message to the logs so the owner can review what
  // people are asking and complaining about (visible in Vercel function logs).
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const text = String(lastUser.content || "");
    const negative = /(suck|terrible|hate|broken|doesn'?t work|useless|awful|stupid|bad|frustrat|annoy)/i.test(text);
    console.log(
      JSON.stringify({
        type: negative ? "USER_FEEDBACK_NEGATIVE" : "USER_MESSAGE",
        at: new Date().toISOString(),
        message: text.slice(0, 500),
      })
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-10).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `Anthropic API ${response.status}`);
    }
    const reply = data.content.map((i) => i.text || "").join("").trim();
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message || "Chat failed" });
  }
}
