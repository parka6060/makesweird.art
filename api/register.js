import { redis, json, err, limit, TTL_ANON } from "./_redis.js";

const TOK_RE = /^[a-z]+-[a-z]+-\d{4}-[a-f0-9]{16}$/;

// rejisters a user with a token
export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const { id } = await req.json();
    if (!id || typeof id !== "string" || !TOK_RE.test(id))
      return err("invalid id");

    const today = new Date().toISOString().slice(0, 10);
    const created = await redis.hsetnx(`user:${id}`, "registeredAt", today);
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
