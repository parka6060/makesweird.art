import { redis, json, err, limit, TTL_ANON, TOK_RE } from "./_redis.js";

// rejisters a user with a token
export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const { id } = await req.json();
    if (!id || typeof id !== "string" || !TOK_RE.test(id))
      return err("invalid id");

    const now = new Date().toISOString();
    const created = await redis.hsetnx(`user:${id}`, "registeredAt", now);
    if (!created) return err("taken");

    const p = redis.pipeline();
    p.hset(`user:${id}`, { streak: 0, lastCheckin: "", name: "" });
    p.expire(`user:${id}`, TTL_ANON);
    await p.exec();

    return json({ ok: true });
  } catch {
    return err("server error", 500);
  }
}
