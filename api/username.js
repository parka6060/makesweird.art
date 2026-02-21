import { redis, json, err, auth, limit, TTL_NAMED } from "./_redis.js";
import { isBannedUsername } from "./_blocklist.js";

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);

    const { name } = await req.json();
    if (!name || typeof name !== "string") return err("name required");

    const clean = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, "")
      .slice(0, 20);
    if (clean.length < 2)
      return err("name must be 2-20 characters (a-z, 0-9, - _)");
    if (isBannedUsername(clean)) return err("name not allowed");

    if (user.name === clean) return json({ ok: true, name: clean });

    // i love u setnx
    const claimed = await redis.setnx(`name:tok:${clean}`, user.tok);
    if (!claimed) return err("name taken");

    const pipe = redis.pipeline();
    if (user.name) {
      pipe.srem("usernames", user.name);
      pipe.del(`name:tok:${user.name}`);
    }
    pipe.sadd("usernames", clean);
    pipe.hset(`user:${user.tok}`, { name: clean });
    pipe.expire(`user:${user.tok}`, TTL_NAMED);
    pipe.expire(`hist:${user.tok}`, TTL_NAMED);
    pipe.expire(`name:tok:${clean}`, TTL_NAMED);
    await pipe.exec();

    return json({ ok: true, name: clean });
  } catch {
    return err("server error", 500);
  }
}
