import { redis, json, err, limit, auth } from "./_redis.js";

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);
    if (!user.admin) return err("unauthorized", 401);

    const { name, unban } = await req.json();
    if (!name || typeof name !== "string") return err("name required");
    const clean = name.trim().toLowerCase();

    const tok = await redis.get(`name:tok:${clean}`);
    if (!tok) return err("user not found");

    if (unban) {
      await redis.hset(`user:${tok}`, { banned: 0 });
      return json({ ok: true, unbanned: clean });
    }

    // find their ip from chat history and ban both
    const msgs = await redis.lrange("chat", 0, -1);
    const ip = [...msgs].reverse().find((m) => m.n === clean)?.ip;

    const pipe = redis.pipeline();
    pipe.hset(`user:${tok}`, { banned: 1 });
    if (ip) pipe.sadd("banned:ips", ip);
    await pipe.exec();

    return json({ ok: true, banned: clean, ip: ip || "no ip in chat" });
  } catch {
    return err("server error", 500);
  }
}
