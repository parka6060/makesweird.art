import { redis, json, err } from "./_redis.js";

export async function GET(req) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return err("missing username");

  const tok = await redis.get(`name:tok:${u}`);
  if (!tok) return err("not found", 404);

  const [user, hist] = await redis.pipeline()
    .hgetall(`user:${tok}`)
    .smembers(`hist:${tok}`)
    .exec();

  if (!user || !user.registeredAt || user.banned == "1")
    return err("not found", 404);

  return json({
    name: user.name || u,
    thing: user.thing || "weird art",
    streak: +user.streak || 0,
    checkins: +user.checkins || 0,
    since: user.registeredAt,
    hist: (hist || []).sort(),
    bio: user.bio || "",
    css: user.css || "",
    links: user.links || "",
  });
}
