import { redis, json, err, limit } from "./_redis.js";

export async function GET(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const today = new Date().toISOString().slice(0, 10);
    const ah = req.headers.get("authorization");
    const tok = ah?.startsWith("Bearer ") ? ah.slice(7) : null;

    const raw = await redis.zrange("lb:streak", 0, 29, {
      rev: true,
      withScores: true,
    });
    if (!raw.length) return json({ board: [], you: null });

    const entries = [];
    for (let i = 0; i < raw.length; i += 2)
      entries.push({ id: raw[i], score: +raw[i + 1] });

    // all candidate profiles + user profile & rank in one pipeline
    const pipe = redis.pipeline();
    for (const e of entries) pipe.hgetall(`user:${e.id}`);
    if (tok) {
      pipe.hgetall(`user:${tok}`);
      pipe.zrevrank("lb:streak", tok);
    }
    const res = await pipe.exec();

    const anonId = (id) =>
      "anon" + (parseInt(id.slice(-6), 16) % 100).toString().padStart(2, "0");

    const candidates = [];
    for (let i = 0; i < entries.length; i++) {
      const p = res[i];
      if (!p || !p.lastCheckin) continue;
      if (Math.round((new Date(today) - new Date(p.lastCheckin)) / 864e5) > 3)
        continue;
      const isYou = entries[i].id === tok;
      const name = p.name || anonId(entries[i].id);
      const isAnon = !p.name;
      candidates.push({
        name,
        thing: p.thing || "weird art",
        streak: entries[i].score,
        you: isYou,
        isAnon,
      });
    }

    // sort: higher streak first, then named users before anon
    candidates.sort((a, b) => b.streak - a.streak || a.isAnon - b.isAnon);

    const board = candidates.slice(0, 20).map(({ isAnon, ...rest }) => rest);
    let you = null;
    for (let i = 0; i < board.length; i++) {
      if (board[i].you) {
        you = { rank: i + 1, ...board[i] };
        break;
      }
    }

    // user not on board
    if (tok && !you) {
      const up = res[entries.length],
        rank = res[entries.length + 1];
      if (up && rank != null)
        you = {
          rank: rank + 1,
          name: up.name || anonId(tok),
          thing: up.thing || "weird art",
          streak: +up.streak || 0,
          you: true,
        };
    }

    return json({ board, you });
  } catch {
    return err("something went very wrong :C", 500);
  }
}
