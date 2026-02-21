// party/chat.js - chatroom logic for makesweird.art

import { Redis } from "@upstash/redis/cloudflare";

const MAX_HISTORY = 100;
const TOK_RE = /^[a-z]+-[a-z]+-\d{4}-[a-f0-9]{16}$/;

export default class ChatRoom {
  users = new Map(); // conn.id → { tok, name, ip }
  history = []; // in-memory message buffer (last 100)
  _redis = null;

  constructor(party) {
    this.party = party;
    this.env = party.env;
  }

  get redis() {
    if (!this._redis) {
      this._redis = new Redis({
        url: this.env.mwa_KV_REST_API_URL,
        token: this.env.mwa_KV_REST_API_TOKEN,
      });
    }
    return this._redis;
  }

  async onStart() {
    // load persisted history once when room wakes from hibernation, which is still 100 messages. the difference is this references the db
    try {
      const raw = await this.redis.lrange("chat", 0, -1);
      this.history = (raw || []).map((m) => {
        const { ip: _, ...r } = m;
        return r;
      });
    } catch {
      this.history = [];
    }
  }

  async onConnect(conn, ctx) {
    const ip =
      ctx.request.headers.get("cf-connecting-ip") ||
      ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    this.users.set(conn.id, { ip });
    conn.send(JSON.stringify({ t: "h", msgs: this.history }));
  }

  async onMessage(msg, sender) {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }
    const info = this.users.get(sender.id);
    if (!info) return;

    // checks for valid token before chat room access
    if (data.t === "a") {
      if (!data.tok || typeof data.tok !== "string" || !TOK_RE.test(data.tok)) {
        sender.send(JSON.stringify({ t: "e", error: "invalid token" }));
        return;
      }
      try {
        const [ipBanned, user] = await this.redis
          .pipeline()
          .sismember("banned:ips", info.ip)
          .hgetall(`user:${data.tok}`)
          .exec();
        if (ipBanned) {
          sender.send(JSON.stringify({ t: "e", error: "banned" }));
          return;
        }
        if (!user || !user.name) {
          sender.send(JSON.stringify({ t: "e", error: "no username set" }));
          return;
        }
        if (user.banned) {
          sender.send(JSON.stringify({ t: "e", error: "banned" }));
          return;
        }
        info.tok = data.tok;
        info.name = user.name;
        // refresh TTL
        const ttl = user.name ? 365 * 86400 : 30 * 86400;
        this.redis.expire(`user:${data.tok}`, ttl).catch(() => {});
        info.admin = !!user.admin;
        sender.send(JSON.stringify({ t: "ok", ...(info.admin && { admin: true }) }));
      } catch {
        sender.send(JSON.stringify({ t: "e", error: "auth failed" }));
      }
      return;
    }

    // send msg
    if (data.t === "m") {
      if (!info.name) {
        sender.send(JSON.stringify({ t: "e", error: "not authenticated — reload page" }));
        return;
      }

      const clean = (data.text || "")
        .replace(/[<>&"']/g, "")
        .replace(/[\x00-\x1f]/g, "")
        .trim()
        .slice(0, 100);
      if (!clean) return;

      // !share command: shares streak with the room
      if (clean === "!share") {
        const go = await this.redis.set(`chat:cd:${info.tok}`, 1, { nx: true, ex: 3 });
        if (!go) { sender.send(JSON.stringify({ t: "e", error: "slow down (3s)" })); return; }
        const user = await this.redis.hgetall(`user:${info.tok}`);
        if (!user || !user.streak || +user.streak < 1) { sender.send(JSON.stringify({ t: "e", error: "no streak to share" })); return; }
        const d = +user.streak === 1 ? "day" : "days";
        const message = { n: info.name, t: info.name + " has been making " + (user.thing || "weird art") + " for " + user.streak + " " + d + ".", ts: new Date().toISOString(), share: true };
        this.history.push(message);
        if (this.history.length > MAX_HISTORY) this.history.shift();
        this.redis.pipeline().rpush("chat", { ...message, ip: info.ip }).ltrim("chat", -MAX_HISTORY, -1).exec().catch(() => {});
        this.party.broadcast(JSON.stringify({ t: "m", msg: message }));
        return;
      }

      // 3s cooldown
      const go = await this.redis.set(`chat:cd:${info.tok}`, 1, {
        nx: true,
        ex: 3,
      });
      if (!go) {
        sender.send(JSON.stringify({ t: "e", error: "slow down (3s)" }));
        return;
      }

      const message = { n: info.name, t: clean, ts: new Date().toISOString() };


      this.history.push(message);
      if (this.history.length > MAX_HISTORY) this.history.shift();
      this.redis
        .pipeline()
        .rpush("chat", { ...message, ip: info.ip })
        .ltrim("chat", -MAX_HISTORY, -1)
        .exec()
        .catch(() => {});

      this.party.broadcast(JSON.stringify({ t: "m", msg: message }));
      return;
    }

    if (data.t === "nuke.") {
      if (!info.admin) return;
      this.history = [];
      this.redis.del("chat").catch(() => {});
      this.party.broadcast(JSON.stringify({ t: "clear" }));
      return;
    }
  }

  onClose(conn) {
    this.users.delete(conn.id);
  }
}
