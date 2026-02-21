import {
  redis,
  json,
  err,
  limit,
  userTz,
  userToday,
  TTL_ANON,
  TTL_NAMED,
} from "./_redis.js";

const TOK_RE = /^[a-z]+-[a-z]+-\d{4}-[a-f0-9]{16}$/;

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

    if (!user?.registeredAt) return err("unauthorized", 401);
    const tz = userTz(req, user);
    const today = userToday(req, user);
    const locked = await redis.get(`ci:${tok}:${tz}:${today}`);
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
      hist: (hist || []).sort(),
      today,
      checkedIn: !!locked,
    });
  } catch {
    return err("server error", 500);
  }
}
