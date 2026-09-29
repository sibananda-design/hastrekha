// Dev helper: opens a one-time sign-in link for an existing user in the default browser (no email sent).
// Usage: node --env-file=.env.local scripts/signin-link.mjs you@example.com [baseUrl]
//   baseUrl defaults to http://localhost:3000 (e.g. https://hastrekha-eta.vercel.app)
import { createClient } from "@supabase/supabase-js";
import { exec } from "node:child_process";

const email = process.argv[2];
const base = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
const url = `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&consent=1`;
exec(process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`);
console.log("Opened sign-in link in the default browser for", email);
