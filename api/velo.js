import { fetch } from 'wix-fetch';
export async function createMemberCode(email, wixUserId, plan) {
  const r = await fetch('https://chat.oyunsanaa.com/api/issue-code', {
    method:'POST',
    headers:{'Content-Type':'application/json','X-WIX-SECRET':process.env.WIX_SECRET},
    body:JSON.stringify({ email, wixUserId, plan })
  });
  return await r.json();
}
export async function onPlanPurchased(event) {
  const { email, userId, planId } = event;
  const res = await createMemberCode(email, userId, planId);
  const code = res.code;
  // send email or show on screen
}

// Wix "Ярилцъя" товч
// link: https://chat.oyunsanaa.com/auth?token=<signed_jwt_from_wix>
