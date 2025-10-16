// functions/api/auth/guest.js
import { CORS, ok, err, sign } from '../../_utils.js';

// ЗОЧИН СЕСС үүсгэх: 2 цаг эсвэл 20 мсг лимит
export const onRequestPost = async ({ request }) => {
  const headers = CORS();
  try {
    const BODY = await request.json().catch(() => ({}));
    const limit = Number(BODY.limit || 20);
    const ttlMs = Number(BODY.ttlMs || 2 * 60 * 60 * 1000); // 2h

    const guest = {
      id: crypto.randomUUID(),
      role: 'guest',
      // soft counters – клиент өсгөж илгээнэ
      used: 0,
      limit,
      exp: Date.now() + ttlMs
    };

    // Cookie-д гарын үсэгтэй хадгална
    const token = sign(guest); // _utils.js → sign(obj) JSON+HMAC
    headers.append(
      'Set-Cookie',
      `oy_guest=${token}; HttpOnly; Path=/; SameSite=Lax; Secure`
    );

    return ok({ guest: { id: guest.id, limit, exp: guest.exp } }, headers);
  } catch (e) {
    return err('guest_init_failed', 500, headers);
  }
};
