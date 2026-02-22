import {
  redis,
  json,
  err,
  limit,
  TTL_ANON,
  TTL_NAMED,
  TOK_RE,
} from "./_redis.js";

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const { id } = await req.json();
    if (!id || typeof id !== "string" || !TOK_RE.test(id))
      return err("invalid key");

    const [user, hist] = await redis
      .pipeline()
      .hgetall(`user:${id}`)
      .smembers(`hist:${id}`)
      .exec();

    if (!user || !user.registeredAt) return err("key not found");

    const ttl = user.name ? TTL_NAMED : TTL_ANON;
    redis
      .pipeline()
      .expire(`user:${id}`, ttl)
      .expire(`hist:${id}`, ttl)
      .exec()
      .catch(() => {});

    return json({
      ok: true,
      name: user.name || "",
      streak: +user.streak || 0,
      checkins: +user.checkins || 0,
      thing: user.thing || "weird art",
      lastCheckin: user.lastCheckin || "",
      hist: (hist || []).sort(),
    });
  } catch {
    return err("server error", 500);
  }
}
