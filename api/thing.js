import { redis, json, err, auth, limit, TTL_ANON, TTL_NAMED } from "./_redis.js";
import { isBannedThing } from "./_blocklist.js";

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);

    const { thing } = await req.json();
    if (!thing || typeof thing !== "string") return err("thing required");

    const clean = thing.replace(/[^a-zA-Z0-9 .,!?'\-]/g, "").replace(/[\x00-\x1f]/g, "").trim().slice(0, 40);
    if (!clean) return err("invalid thing");
    if (isBannedThing(clean)) return err("not allowed");

    const ttl = user.name ? TTL_NAMED : TTL_ANON;
    await redis.pipeline()
      .hset(`user:${user.tok}`, { thing: clean })
      .expire(`user:${user.tok}`, ttl)
      .exec();

    return json({ ok: true });
  } catch {
    return err("server error", 500);
  }
}
