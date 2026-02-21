import { redis, json, err, limit } from "./_redis.js";

export async function GET(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const today = new Date().toISOString().slice(0, 10);
    const ah = req.headers.get("authorization");
    const tok = ah?.startsWith("Bearer ") ? ah.slice(7) : null;

    const raw = await redis.zrange("lb:streak", 0, 14, { rev: true, withScores: true });
    if (!raw.length) return json({ board: [], you: null });

    const entries = [];
    for (let i = 0; i < raw.length; i += 2) entries.push({ id: raw[i], score: +raw[i + 1] });

    // all candidate profiles + user profile & rank in one pipeline
    const pipe = redis.pipeline();
    for (const e of entries) pipe.hgetall(`user:${e.id}`);
    if (tok) { pipe.hgetall(`user:${tok}`); pipe.zrevrank("lb:streak", tok); }
    const res = await pipe.exec();

    const board = [];
    let you = null;
    for (let i = 0; i < entries.length; i++) {
      const p = res[i];
      if (!p?.name) continue;
      if (Math.round((new Date(today) - new Date(p.lastCheckin || "")) / 864e5) > 2) continue;
      board.push({ name: p.name, thing: p.thing || "weird art", streak: entries[i].score });
      if (entries[i].id === tok) you = { rank: board.length, name: p.name, thing: p.thing || "weird art", streak: entries[i].score };
      if (board.length >= 10) break;
    }

    // user not on board
    if (tok && !you) {
      const up = res[entries.length], rank = res[entries.length + 1];
      if (up?.name && rank != null) you = { rank: rank + 1, name: up.name, thing: up.thing || "weird art", streak: +up.streak || 0 };
    }

    return json({ board, you });
  } catch {
    return err("something went very wrong :C", 500);
  }
}
