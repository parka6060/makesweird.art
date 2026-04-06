import { redis, json, err, auth, limit } from "./_redis.js";

const MAX_BIO = 777;
const MAX_CSS = 2048;
const strip = (s) => s.replace(/[\x00-\x08\x0b\x0e-\x1f\x7f]/g, "");

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body) return err("bad request");

    const updates = {};
    if (typeof body.bio === "string")
      updates.bio = strip(body.bio).slice(0, MAX_BIO);
    if (typeof body.css === "string")
      updates.css = strip(body.css).replace(/<\/style/gi, "").replace(/@import\b/gi, "").slice(0, MAX_CSS);
    if (typeof body.verb === "string")
      updates.verb = strip(body.verb).replace(/[^a-zA-Z\s]/g, "").trim().slice(0, 24);
    if (typeof body.links === "string")
      updates.links = body.links.replace(/[\x00-\x08\x0b\x0e-\x1f\x7f]/g, "").slice(0, 800);

    if (!Object.keys(updates).length) return err("nothing to update");

    await redis.hset(`user:${user.tok}`, updates);
    return json({ ok: true, ...updates });
  } catch {
    return err("server error", 500);
  }
}
