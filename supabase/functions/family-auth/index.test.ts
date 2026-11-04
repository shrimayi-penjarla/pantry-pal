// Integration tests for the family-auth edge function (username/password auth).
// These call the DEPLOYED function over HTTP, so they validate the live
// sign-up/sign-in path end to end. Test accounts use random usernames.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN = `${SUPABASE_URL}/functions/v1/family-auth`;

const post = (body: unknown) =>
  fetch(FN, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body),
  });

const randomUsername = () => `qa_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
// Strong enough to pass the weak-password screen, unique per run.
const randomPassword = () => `Qa!${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}#x`;

Deno.test("CORS preflight returns ok with allow headers", async () => {
  const res = await fetch(FN, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin") !== null);
  assert(res.headers.get("access-control-allow-headers") !== null);
});

Deno.test("GET is rejected with 405", async () => {
  const res = await fetch(FN, { headers: { apikey: ANON_KEY } });
  await res.text();
  assertEquals(res.status, 405);
});

Deno.test("invalid username format is rejected with 400", async () => {
  const res = await post({ action: "signup", username: "ab", password: "whatever123" });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertStringIncludes(body.error, "Username");
});

Deno.test("weak/short password is rejected with 400", async () => {
  const res = await post({ action: "signup", username: randomUsername(), password: "123" });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertStringIncludes(body.error, "Password");
});

Deno.test("invalid action is rejected with 400", async () => {
  const res = await post({ action: "delete", username: randomUsername(), password: "whatever123" });
  const body = await res.json();
  assertEquals(res.status, 400);
});

Deno.test("signup returns a redeemable token_hash", async () => {
  const username = randomUsername();
  const res = await post({ action: "signup", username, password: randomPassword() });
  const body = await res.json();
  assertEquals(res.status, 200);
  assert(typeof body.token_hash === "string" && body.token_hash.length > 10);
  assertStringIncludes(body.email, "@users.freshtrack.app");
});

Deno.test("duplicate username signup is rejected with 409", async () => {
  const username = randomUsername();
  const password = randomPassword();
  const first = await post({ action: "signup", username, password });
  await first.text();
  assertEquals(first.status, 200);

  const second = await post({ action: "signup", username, password });
  const body = await second.json();
  assertEquals(second.status, 409);
  assertStringIncludes(body.error, "already taken");
});

Deno.test("signin with wrong password is rejected with 401", async () => {
  const username = randomUsername();
  const first = await post({ action: "signup", username, password: randomPassword() });
  await first.text();
  assertEquals(first.status, 200);

  const res = await post({ action: "signin", username, password: randomPassword() });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertStringIncludes(body.error, "incorrect");
});

Deno.test("two concurrent signins (family sharing) both succeed", async () => {
  const username = randomUsername();
  const password = randomPassword();
  const first = await post({ action: "signup", username, password });
  await first.text();
  assertEquals(first.status, 200);

  const [a, b] = await Promise.all([
    post({ action: "signin", username, password }),
    post({ action: "signin", username, password }),
  ]);
  const [bodyA, bodyB] = await Promise.all([a.json(), b.json()]);
  assertEquals(a.status, 200);
  assertEquals(b.status, 200);
  assert(bodyA.token_hash && bodyB.token_hash);
  // Each session gets its own token
  assert(bodyA.token_hash !== bodyB.token_hash);
});

Deno.test("signin for a nonexistent username is rejected with 401, not 500", async () => {
  const res = await post({ action: "signin", username: randomUsername(), password: randomPassword() });
  const body = await res.json();
  assertEquals(res.status, 401);
});
