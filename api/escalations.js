import { sql } from "@vercel/postgres";

// Ensure the table exists (cheap no-op after first run).
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS escalations (
      id SERIAL PRIMARY KEY,
      ticket_id TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_email TEXT,
      question TEXT NOT NULL,
      history TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      reply TEXT,
      replied_at TIMESTAMPTZ
    );
  `;
}

function makeTicketId() {
  return "t_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    // POST = create a new escalation (called from the public chat widget).
    // Email is optional; we return a ticketId the browser stores to fetch replies.
    if (req.method === "POST") {
      const { userEmail, question, history } = req.body || {};
      if (!question) {
        return res.status(400).json({ error: "Missing question" });
      }
      const email = userEmail ? String(userEmail) : null;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email" });
      }
      const ticketId = makeTicketId();
      await sql`
        INSERT INTO escalations (ticket_id, user_email, question, history)
        VALUES (${ticketId}, ${email}, ${String(question).slice(0, 2000)}, ${String(history || "").slice(0, 8000)});
      `;
      return res.status(200).json({ ok: true, ticketId });
    }

    if (req.method === "GET") {
      // Public lookup by ticket — lets a returning user fetch the reply to
      // their own question. Only exposes that one ticket's status + reply.
      const ticket = req.query?.ticket;
      if (ticket) {
        const { rows } = await sql`
          SELECT status, reply, replied_at FROM escalations WHERE ticket_id = ${String(ticket)} LIMIT 1;
        `;
        if (rows.length === 0) return res.status(404).json({ error: "Not found" });
        return res.status(200).json(rows[0]);
      }

      // Otherwise: list escalations (admin only — requires the admin password)
      const pw = req.headers["x-admin-password"];
      if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { rows } = await sql`
        SELECT id, ticket_id, created_at, user_email, question, history, status, reply, replied_at
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
