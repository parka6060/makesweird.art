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
    redis
      .pipeline()
      .expire(`user:${tok}`, ttl)
      .expire(`hist:${tok}`, ttl)
      .exec()
      .catch(() => {});

    return json({
      streak: +user.streak || 0,
      lastCheckin: user.lastCheckin || "",
      thing: user.thing || "",
      hist: since ? (hist || []).filter(d => d > since).sort() : (hist || []).sort(),
      today,
      checkedIn: user.lastCheckin === today,
    });
  } catch {
    return err("server error", 500);
  }
}
