export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { key, mood, progressionSections, sections } = req.body;
  // sections: [{ id: "verse", label: "Verse", lyrics: "..." }, ...]

  const results = {};

  for (const section of sections) {
    if (!section.lyrics) continue;

    const sectionChords = progressionSections?.[section.id] || "";
    const prompt = `You are a music arranger for piano. Write an ABC notation melody for the ${section.label} section (8 bars, 4/4 time).

Key: ${key}
Style/Mood: ${mood}
Chord progression for this section (Roman numerals): ${sectionChords}
Lyrics (${section.label}): ${section.lyrics}

Rules:
- Output ONLY raw ABC notation. No markdown, no code fences, no explanation.
- Start with X:1 on the first line.
- Include these headers: T:${section.label}, M:4/4, L:1/8, Q:1/4=90, K:${key}
- Single melody line only — no harmony voices.
- Match note rhythm to syllable stress in the lyrics.
- Keep it simple and singable for piano.
- Add chord symbols above the notes using ABC chord syntax: "ChordName"Note — for example "C"G2 means play G with chord C above it. Place a chord at the start of each bar.
- Add lyrics below the staff using the w: field after each bar line group. Each syllable maps to one note. Use a hyphen - to connect syllables of the same word, and a space between words. Put the full w: line after the melody line.

Example with chords and lyrics:
X:1
T:Verse
M:4/4
L:1/8
Q:1/4=90
K:C
|: "C"G2 AB "G"c2 BA | "Am"G4 "F"E2 D2 | "C"F2 GA "G"B2 AG | "Am"E4 "F"E4 :|
w: Some-where o-ver the rain- bow way up high`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const abc = data.content.map((i) => i.text || "").join("").replace(/```abc|```/g, "").trim();
    results[section.id] = abc;
  }

  res.status(200).json({ sections: results });
}
