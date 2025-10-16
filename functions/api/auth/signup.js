import { CORS, ok, err, hashPass, uuid, sign } from "../../_utils.js";

export async function onRequestOptions() { return new Response(null, { status:204, headers: CORS }); }
export async function onRequestPost({ request, env }) {
  const { email, password, name, ageBand } = await request.json().catch(()=> ({}));
  if (!email || !password) return err(400, { error: "email/password required" });

  const db = env.OY_DB; // D1 binding
  const id = uuid();
  const pass_hash = await hashPass(password);
  try {
    await db.prepare(
      "INSERT INTO users (id, email, pass_hash, name, age_band, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, email, pass_hash, name||"", ageBand||"", Date.now()).run();
  } catch {
    return err(409, { error: "Email exists" });
  }
  // trial-start
  await db.prepare("INSERT OR REPLACE INTO usage (user_id, msg_count, trial_started_at) VALUES (?, 0, ?)").bind(id, Date.now()).run();

  const token = await sign({ uid:id, email }, env.APP_SECRET);
  return ok({ token, uid: id });
}
