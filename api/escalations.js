import { sql } from "@vercel/postgres";

// Ensure the table exists (cheap no-op after first run).
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS escalations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_email TEXT NOT NULL,
      question TEXT NOT NULL,
      history TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      reply TEXT,
      replied_at TIMESTAMPTZ
    );
  `;
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    // POST = create a new escalation (called from the public chat widget)
    if (req.method === "POST") {
      const { userEmail, question, history } = req.body || {};
      if (!userEmail || !question) {
        return res.status(400).json({ error: "Missing email or question" });
      }
      // light email sanity check
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(userEmail))) {
        return res.status(400).json({ error: "Invalid email" });
      }
      await sql`
        INSERT INTO escalations (user_email, question, history)
        VALUES (${String(userEmail)}, ${String(question).slice(0, 2000)}, ${String(history || "").slice(0, 8000)});
      `;
      return res.status(200).json({ ok: true });
    }

    // GET = list escalations (admin only — requires the admin password)
    if (req.method === "GET") {
      const pw = req.headers["x-admin-password"];
      if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { rows } = await sql`
        SELECT id, created_at, user_email, question, history, status, reply, replied_at
        FROM escalations
        ORDER BY created_at DESC
        LIMIT 200;
      `;
      return res.status(200).json({ escalations: rows });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
