import { CORS, ok, err, hashPass, sign } from "../../_utils.js";

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) return err(400, { error: "Имэйл/нууц үг дутуу" });

  const kv = env.OY_KV;
  const key = "user:" + email.toLowerCase();
  const user = await kv.get(key, { type: "json" });
  if (!user) return err(401, { error: "И-мэйл бүртгэлгүй" });

  const okPass = (await hashPass(password)) === user.pass;
  if (!okPass) return err(401, { error: "Нууц үг буруу" });

  const token = await sign({ uid: user.id, email: user.email }, env.APP_SECRET);
  return ok({ token, uid: user.id, name: user.name, ageBand: user.ageBand });
}
