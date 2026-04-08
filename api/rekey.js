import { redis, json, err, limit, auth, TTL_ANON, TTL_NAMED } from "./_redis.js";
import { genTok } from "./_token.js";

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);

    // generate a new unique token
    let newTok;
    for (let i = 0; i < 10; i++) {
      const candidate = genTok();
      const claimed = await redis.hsetnx(`user:${candidate}`, "registeredAt", user.registeredAt);
      if (claimed) { newTok = candidate; break; }
    }
    if (!newTok) return err("server error", 500);

    const ttl = user.name ? TTL_NAMED : TTL_ANON;

    // copy all user data + hist to new token
    const p = redis.pipeline();
    p.hset(`user:${newTok}`, {
      registeredAt: user.registeredAt,
      streak: user.streak || 0,
      lastCheckin: user.lastCheckin || "",
      checkins: user.checkins || 0,
      name: user.name || "",
      thing: user.thing || "",
      bio: user.bio || "",
      css: user.css || "",
      links: user.links || "",
      tz: user.tz || "",
    });
    p.expire(`user:${newTok}`, ttl);

    // migrate history
    const hist = await redis.smembers(`hist:${user.tok}`);
    if (hist && hist.length) {
      p.sadd(`hist:${newTok}`, ...hist);
      p.expire(`hist:${newTok}`, ttl);
    }

    // update name index
    if (user.name) {
      p.set(`name:tok:${user.name}`, newTok);
      p.expire(`name:tok:${user.name}`, ttl);
    }

    // migrate leaderboard entries
    p.zrem("lb:streak", user.tok);
    p.zadd("lb:streak", { score: +(user.streak) || 0, member: newTok });
    p.zrem("lb:checkins", user.tok);
    p.zadd("lb:checkins", { score: +(user.checkins) || 0, member: newTok });

    // delete old token
    p.del(`user:${user.tok}`);
    p.del(`hist:${user.tok}`);

    await p.exec();

    return json({ ok: true, id: newTok });
  } catch {
    return err("server error", 500);
  }
}
