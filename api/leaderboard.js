import { redis, json, err, limit } from "./_redis.js";

export async function GET(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const today = new Date().toISOString().slice(0, 10);
    const ah = req.headers.get("authorization");
    const tok = ah?.startsWith("Bearer ") ? ah.slice(7) : null;

    // fetch both leaderboards in parallel
    const [rawStreak, rawCheckins] = await Promise.all([
      redis.zrange("lb:streak", 0, 29, { rev: true, withScores: true }),
      redis.zrange("lb:checkins", 0, 29, { rev: true, withScores: true }),
    ]);

    const parseEntries = (raw) => {
      const entries = [];
      for (let i = 0; i < raw.length; i += 2)
        entries.push({ id: raw[i], score: +raw[i + 1] });
      return entries;
    };

    const streakEntries = parseEntries(rawStreak);
    const checkinEntries = parseEntries(rawCheckins);

    // collect all unique token IDs we need profiles for
    const allIds = [...new Set([
      ...streakEntries.map(e => e.id),
      ...checkinEntries.map(e => e.id),
    ])];

    // fetch all profiles + user ranks in one pipeline
    const pipe = redis.pipeline();
    for (const id of allIds) pipe.hgetall(`user:${id}`);
    if (tok) {
      pipe.hgetall(`user:${tok}`);
      pipe.zrevrank("lb:streak", tok);
      pipe.zrevrank("lb:checkins", tok);
    }
    const res = await pipe.exec();

    // build profile lookup
    const profiles = {};
    for (let i = 0; i < allIds.length; i++) profiles[allIds[i]] = res[i];

    const anonId = (id) =>
      "anon" + (parseInt(id.slice(-6), 16) % 100).toString().padStart(2, "0");

    function buildBoard(entries, scoreKey) {
      const candidates = [];
      for (const e of entries) {
        const p = profiles[e.id];
        if (!p || !p.lastCheckin) continue;
        // for streak board, filter stale entries
        if (scoreKey === "streak") {
          if (Math.round((new Date(today) - new Date(p.lastCheckin)) / 864e5) > 3)
            continue;
        }
        if (scoreKey === "checkins" && e.score < 2) continue;
        candidates.push({
          name: p.name || anonId(e.id),
          thing: p.thing || "weird art",
          [scoreKey]: e.score,
          you: e.id === tok,
          isAnon: !p.name,
        });
      }
      candidates.sort((a, b) => b[scoreKey] - a[scoreKey] || a.isAnon - b.isAnon);
      return candidates.slice(0, 20).map(({ isAnon, ...rest }) => rest);
    }

    const streakBoard = buildBoard(streakEntries, "streak");
    let checkinsBoard = buildBoard(checkinEntries, "checkins");

    // fallback: if lb:checkins is empty (new sorted set), build from loaded profiles
    if (!checkinsBoard.length && allIds.length) {
      const fallback = [];
      for (const id of allIds) {
        const p = profiles[id];
        if (!p || !p.checkins || +p.checkins < 2) continue;
        fallback.push({
          name: p.name || anonId(id),
          thing: p.thing || "weird art",
          checkins: +p.checkins,
          you: id === tok,
          isAnon: !p.name,
        });
      }
      fallback.sort((a, b) => b.checkins - a.checkins || a.isAnon - b.isAnon);
      checkinsBoard = fallback.slice(0, 20).map(({ isAnon, ...rest }) => rest);
    }

    // "just checked in" — recent check-ins from all profiles we loaded
    const recentCandidates = [];
    for (const id of allIds) {
      const p = profiles[id];
      if (!p || !p.lastCheckin) continue;
      const age = Math.round((new Date(today) - new Date(p.lastCheckin)) / 864e5);
      if (age > 1) continue; // today or yesterday only
      recentCandidates.push({
        name: p.name || anonId(id),
        thing: p.thing || "weird art",
        lastCheckin: p.lastCheckin,
        you: id === tok,
        isAnon: !p.name,
      });
    }
    recentCandidates.sort((a, b) =>
      b.lastCheckin.localeCompare(a.lastCheckin) || a.isAnon - b.isAnon
    );
    const recentBoard = recentCandidates.slice(0, 15).map(({ isAnon, lastCheckin, ...rest }) => ({
      ...rest, today: lastCheckin === today,
    }));

    // find user position on streak board
    let you = null;
    for (let i = 0; i < streakBoard.length; i++) {
      if (streakBoard[i].you) { you = { rank: i + 1, ...streakBoard[i] }; break; }
    }
    if (tok && !you) {
      const up = res[allIds.length], rank = res[allIds.length + 1];
      if (up && rank != null)
        you = {
          rank: rank + 1,
          name: up.name || anonId(tok),
          thing: up.thing || "weird art",
          streak: +up.streak || 0,
          you: true,
        };
    }

    // find user position on checkins board
    let youCheckins = null;
    for (let i = 0; i < checkinsBoard.length; i++) {
      if (checkinsBoard[i].you) { youCheckins = { rank: i + 1, ...checkinsBoard[i] }; break; }
    }
    if (tok && !youCheckins) {
      const up = res[allIds.length], rank = res[allIds.length + 2];
      if (up && rank != null)
        youCheckins = {
          rank: rank + 1,
          name: up.name || anonId(tok),
          thing: up.thing || "weird art",
          checkins: +up.checkins || 0,
          you: true,
        };
    }

    return json({
      board: streakBoard,
      you,
      checkinsBoard,
      youCheckins,
      recentBoard,
    });
  } catch {
    return err("something went very wrong :C", 500);
  }
}
