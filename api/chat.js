import { redis, json, err, limit } from "./_redis.js";

// read-only fallback
export async function GET(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const raw = await redis.lrange("chat", 0, -1);
    const data = raw.map(r => { const { ip, ...m } = r; return m; });
    return json(data);
  } catch {
    return err("server error", 500);
  }
}
