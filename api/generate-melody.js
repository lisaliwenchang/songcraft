export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { key, mood, chordProgression, lyrics } = req.body;

  const prompt = `You are a music arranger for piano. Write an ABC notation melody for the verse section (8 bars, 4/4 time).

Key: ${key}
Style/Mood: ${mood}
Chord progression (one chord per bar, cycling): ${chordProgression}
Lyrics (verse): ${lyrics}

Rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no explanation.
- Start with X:1 on the first line.
- Include these headers: T: (title), M:4/4, L:1/8, Q:1/4=90, K:${key}
- Single melody line only — no chords, no harmony, no multiple voices.
- Match note rhythm to syllable stress in the lyrics.
- Keep it simple and singable for piano.

Example format:
X:1
T:Verse
M:4/4
L:1/8
Q:1/4=90
K:C
|: G2 AB c2 BA | G4 E2 D2 | F2 GA B2 AG | E8 :|`;

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
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const abc = data.content.map((i) => i.text || "").join("").replace(/```abc|```/g, "").trim();
    res.status(200).json({ abc });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate melody" });
  }
}
