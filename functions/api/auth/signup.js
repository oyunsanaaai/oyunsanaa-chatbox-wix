import { CORS, ok, err, uuid, hashPass, sign } from "../../_utils.js";

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  const { email, password, name = "", ageBand = "" } = await request.json().catch(() => ({}));
  if (!email || !password) return err(400, { error: "Имэйл/нууц үг дутуу" });

  const kv = env.OY_KV;
  const key = "user:" + email.toLowerCase();
  if (await kv.get(key)) return err(409, { error: "Энэ имэйл бүртгэлтэй" });

  const user = {
    id: uuid(),
    email: email.toLowerCase(),
    name, ageBand,
    pass: await hashPass(password),
    createdAt: Date.now()
  };
  await kv.put(key, JSON.stringify(user));

  const token = await sign({ uid: user.id, email: user.email }, env.APP_SECRET);
  return ok({ token, uid: user.id, name: user.name, ageBand: user.ageBand });
}
