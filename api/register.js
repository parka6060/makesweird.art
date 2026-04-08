import { redis, json, err, limit, TTL_ANON } from "./_redis.js";
import { genTok } from "./_token.js";

// registers a user, generating the token server-side
export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const now = new Date().toISOString();
    for (let i = 0; i < 10; i++) {
      const id = genTok();
      const created = await redis.hsetnx(`user:${id}`, "registeredAt", now);
      if (!created) continue;
      const p = redis.pipeline();
      p.hset(`user:${id}`, { streak: 0, lastCheckin: "", name: "" });
      p.expire(`user:${id}`, TTL_ANON);
      await p.exec();
      return json({ ok: true, id });
    }
    return err("server error", 500);
  } catch {
    return err("server error", 500);
  }
}
