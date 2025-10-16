import { CORS, ok, err, hashPass, sign } from "../../_utils.js";

export async function onRequestOptions(){ return new Response(null, { status:204, headers: CORS }); }
export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json().catch(()=> ({}));
  if (!email || !password) return err(400, { error:"email/password required" });

  const db = env.OY_DB;
  const row = await db.prepare("SELECT id, pass_hash FROM users WHERE email=?").bind(email).first();
  if (!row) return err(401, { error:"invalid credentials" });
  const okPass = (await hashPass(password)) === row.pass_hash;
  if (!okPass) return err(401, { error:"invalid credentials" });

  const token = await sign({ uid: row.id, email }, env.APP_SECRET);
  return ok({ token, uid: row.id });
}
