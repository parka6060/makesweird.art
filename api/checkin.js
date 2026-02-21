import {
  redis,
  json,
  err,
  auth,
  limit,
  TTL_ANON,
  TTL_NAMED,
} from "./_redis.js";
import { isBannedThing } from "./_blocklist.js";

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);

    const { thing } = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    // prevent dup check-ins
    const lock = await redis.set(`ci:${user.tok}:${today}`, 1, {
      nx: true,
      ex: 86400,
    });
    if (!lock) {
      return json({ ok: true, streak: +user.streak, dup: true });
    }

    // compute new streak
    const last = user.lastCheckin;
    const gap = last
      ? Math.round((new Date(today) - new Date(last)) / 864e5)
      : 0;
    const streak = last === "" ? 1 : gap <= 2 ? (+user.streak || 0) + 1 : 1;

    const updates = {
      checkins: (+user.checkins || 0) + 1,
      streak,
      lastCheckin: today,
    };
    if (thing && typeof thing === "string") {
      const cleanThing = thing
        .replace(/[^a-zA-Z0-9 .,!?'\-]/g, "")
        .replace(/[\x00-\x1f]/g, "")
        .trim()
        .slice(0, 40);
      if (cleanThing && !isBannedThing(cleanThing)) updates.thing = cleanThing;
    }

    const ttl = user.name ? TTL_NAMED : TTL_ANON;
    const pipe = redis.pipeline();
    pipe.hset(`user:${user.tok}`, updates);
    pipe.zadd("lb:streak", { score: streak, member: user.tok });
    pipe.sadd(`hist:${user.tok}`, today);
    pipe.expire(`user:${user.tok}`, ttl);
    pipe.expire(`hist:${user.tok}`, ttl);
    if (user.name) pipe.expire(`name:tok:${user.name}`, TTL_NAMED);
    await pipe.exec();

    return json({ ok: true, streak });
  } catch {
    return err("server error", 500);
  }
}
