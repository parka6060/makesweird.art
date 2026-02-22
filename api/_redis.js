import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.mwa_KV_REST_API_URL,
  token: process.env.mwa_KV_REST_API_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "rl",
});

export const TOK_RE = /^[a-z]+-[a-z]+-\d{4}-[a-f0-9]{16}$/;

export const TTL_ANON = 30 * 86400; // 30 days
export const TTL_NAMED = 365 * 86400; // 1 year

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function err(msg, status = 400) {
  return json({ error: msg }, status);
}

export async function limit(req) {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const { success } = await ratelimit.limit(ip);
  if (!success) return err("slow down", 429);
  return null;
}

export async function auth(req) {
  const h = req.headers.get("authorization");
  if (!h || !h.startsWith("Bearer ")) return null;
  const tok = h.slice(7);
  if (!TOK_RE.test(tok)) return null;
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const [ipBanned, user] = await redis
    .pipeline()
    .sismember("banned:ips", ip)
    .hgetall(`user:${tok}`)
    .exec();
  if (ipBanned) return null;
  if (!user || !user.registeredAt) return null;
  if (user.banned) return null;
  // refresh TTL
  const ttl = user.name ? TTL_NAMED : TTL_ANON;
  redis
    .pipeline()
    .expire(`user:${tok}`, ttl)
    .expire(`hist:${tok}`, ttl)
    .exec()
    .catch(() => {});
  return { tok, ...user };
}

export function userTz(req, user) {
  return user?.tz || req.headers.get("x-vercel-ip-timezone") || "UTC";
}

export function userToday(req, user) {
  const tz = userTz(req, user);
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
