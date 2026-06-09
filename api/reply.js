import { sql } from "@vercel/postgres";

// Admin-only: email a reply to the user and mark the escalation answered.
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
    // Look up the escalation to get the recipient + original question.
    const { rows } = await sql`SELECT user_email, question FROM escalations WHERE id = ${id};`;
    if (rows.length === 0) {
      return res.status(404).json({ error: "Escalation not found" });
    }
    const { user_email, question } = rows[0];

    // Send the email via Resend.
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.REPLY_FROM || "SongCraft <onboarding@resend.dev>",
        to: user_email,
        subject: "Re: your SongCraft question",
        text: `Hi,\n\nThanks for reaching out through SongCraft. You asked:\n\n"${question}"\n\nOur reply:\n\n${reply}\n\n— The SongCraft team`,
      }),
    });
    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      throw new Error(emailData?.message || `Resend API ${emailRes.status}`);
    }

    await sql`
      UPDATE escalations
      SET status = 'answered', reply = ${String(reply)}, replied_at = now()
      WHERE id = ${id};
    `;

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Reply failed" });
  }
}
