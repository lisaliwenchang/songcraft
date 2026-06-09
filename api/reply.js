import { sql } from "@vercel/postgres";

// Admin-only: save a reply to an escalation and mark it answered.
// No email is sent — the user sees the reply when they reopen the chat on the
// same browser (the widget looks it up by the ticket id stored locally).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pw = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, reply } = req.body || {};
  if (!id || !reply) {
    return res.status(400).json({ error: "Missing id or reply" });
  }

  try {
    const { rowCount } = await sql`
      UPDATE escalations
      SET status = 'answered', reply = ${String(reply)}, replied_at = now()
      WHERE id = ${id};
    `;
    if (rowCount === 0) return res.status(404).json({ error: "Escalation not found" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Reply failed" });
  }
}
