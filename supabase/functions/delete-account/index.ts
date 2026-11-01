import { createClient } from "npm:@supabase/supabase-js@2.76.1";

// Authenticated, self-service deletion. The service key NEVER reaches the browser.
// This endpoint must be deployed with JWT verification ENABLED.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const accessToken = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!accessToken) return respond({ error: "Authentication required" }, 401);
  let body: { confirmation?: string };
  try { body = await req.json(); } catch { return respond({ error: "Invalid request" }, 400); }
  if (body.confirmation !== "LÖSCHEN") return respond({ error: "Confirmation required" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return respond({ error: "Service unavailable" }, 503);
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    // Never accept a user ID from request JSON. Always resolve the actual bearer token.
    const { data: { user }, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !user) return respond({ error: "Authentication failed" }, 401);
    const prefix = user.id;

    // Storage files must be removed before deleting auth.users; otherwise deletion can fail.
    const paths: string[] = [];
    const root = await admin.storage.from("tree-photos").list(prefix, { limit: 1000 });
    if (root.error) throw root.error;
    if ((root.data || []).length >= 1000) return respond({ error: "Too many files; contact support" }, 409);
    for (const entry of root.data || []) {
      if (entry.id) {
        paths.push(prefix + "/" + entry.name);
        continue;
      }
      const folder = await admin.storage.from("tree-photos").list(prefix + "/" + entry.name, { limit: 1000 });
      if (folder.error) throw folder.error;
      if ((folder.data || []).length >= 1000) return respond({ error: "Too many files; contact support" }, 409);
      for (const file of folder.data || []) {
        if (file.id) paths.push(prefix + "/" + entry.name + "/" + file.name);
      }
    }

    // Metadata may refer to existing objects even if folder listing is incomplete.
    const metadata = await admin.from("tree_photos").select("storage_path").eq("user_id", prefix);
    if (metadata.error) throw metadata.error;
    for (const photo of metadata.data || []) paths.push(photo.storage_path);
    const all = [...new Set(paths)];
    for (let i = 0; i < all.length; i += 100) {
      const removed = await admin.storage.from("tree-photos").remove(all.slice(i, i + 100));
      if (removed.error) throw removed.error;
    }

    // FK ON DELETE CASCADE cleans profile, trees, photo metadata, likes and comments.
    const deletion = await admin.auth.admin.deleteUser(prefix);
    if (deletion.error) throw deletion.error;
    return respond({ deleted: true });
  } catch (error) {
    console.error("Self-service account deletion failed", error);
    return respond({ error: "Account could not be deleted. Please contact support." }, 500);
  }
});
