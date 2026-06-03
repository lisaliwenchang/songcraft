export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { key, mood, chordProgression, sections } = req.body;
  // sections: [{ id: "verse", label: "Verse", lyrics: "..." }, ...]

  const results = {};

  for (const section of sections) {
    if (!section.lyrics) continue;

    const prompt = `You are a music arranger for piano. Write an ABC notation melody for the ${section.label} section (8 bars, 4/4 time).

Key: ${key}
Style/Mood: ${mood}
Chord progression (one chord per bar, cycling): ${chordProgression}
Lyrics (${section.label}): ${section.lyrics}

Rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no explanation.
- Start with X:1 on the first line.
- Include these headers: T:${section.label}, M:4/4, L:1/8, Q:1/4=90, K:${key}
- Single melody line only — no chords, no harmony, no multiple voices.
- Match note rhythm to syllable stress in the lyrics.
- Keep it simple and singable for piano.`;

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
    results[section.id] = abc;
  }

  res.status(200).json({ sections: results });
}
