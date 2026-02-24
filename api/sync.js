import {
  redis,
  json,
  err,
  limit,
  userToday,
  TTL_ANON,
  TTL_NAMED,
  TOK_RE,
} from "./_redis.js";

// syncs user data based on token
export async function GET(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const h = req.headers.get("authorization");
    if (!h?.startsWith("Bearer ")) return err("unauthorized", 401);
    const tok = h.slice(7);
    if (!TOK_RE.test(tok)) return err("unauthorized", 401);

    const [user, hist] = await redis
      .pipeline()
      .hgetall(`user:${tok}`)
      .smembers(`hist:${tok}`)
      .exec();

    if (!user?.registeredAt || user.banned) return err("unauthorized", 401);
    const today = userToday(req, user);
    const since = new URL(req.url).searchParams.get("since");
    const ttl = user.name ? TTL_NAMED : TTL_ANON;

    let streak = +user.streak || 0;
    const last = user.lastCheckin;
    const gap = last
      ? Math.round((new Date(today) - new Date(last)) / 864e5)
      : 0;

    // server-side streak reset: if user has been gone too long, zero it out
    if (streak > 0 && last && gap >= 3) {
      streak = 0;
      await redis
        .pipeline()
        .hset(`user:${tok}`, { streak: 0 })
        .zadd("lb:streak", { score: 0, member: tok })
        .expire(`user:${tok}`, ttl)
        .expire(`hist:${tok}`, ttl)
        .exec();
    } else {
      redis
        .pipeline()
        .expire(`user:${tok}`, ttl)
        .expire(`hist:${tok}`, ttl)
        .exec()
        .catch(() => {});
    }

    return json({
      streak,
      lastCheckin: last || "",
      thing: user.thing || "",
      hist: since ? (hist || []).filter(d => d > since).sort() : (hist || []).sort(),
      today,
      checkedIn: last === today,
    });
  } catch {
    return err("server error", 500);
  }
}
