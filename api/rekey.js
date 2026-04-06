import { redis, json, err, limit, auth, TOK_RE, TTL_ANON, TTL_NAMED } from "./_redis.js";

const ADJ = ["bold","brave","calm","cool","cozy","cute","dark","deep","fair","fast","free","glad","gold","hazy","keen","kind","loud","lush","mild","neat","odd","pale","raw","shy","soft","warm","wild","swift","quiet","tiny","vast","wise","zany","silly","dumb","green","orange","happy","friendly","liminal","dorky","teal"];
const NOUN = ["bear","bird","bone","cave","clay","crow","dawn","deer","dusk","fawn","fire","fish","frog","glow","hare","hawk","jade","lake","leaf","moth","mist","moss","newt","pine","reed","seed","snow","star","wren","yarn","wolf","owl","box","mouse","teddy","soy","beat","mlg","penguin","egg","oli","boo","sky","rain","stream","friend","weirdo","drawing"];
const pick = (a) => a[(Math.random() * a.length) | 0];
const genTok = () => {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return pick(ADJ) + "-" + pick(NOUN) + "-" + (1000 + ((Math.random() * 9000) | 0)) + "-" + hex;
};

export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const user = await auth(req);
    if (!user) return err("unauthorized", 401);

    // generate a new unique token
    let newTok;
    for (let i = 0; i < 10; i++) {
      const candidate = genTok();
      const exists = await redis.exists(`user:${candidate}`);
      if (!exists) { newTok = candidate; break; }
    }
    if (!newTok) return err("server error", 500);

    const ttl = user.name ? TTL_NAMED : TTL_ANON;

    // copy all user data + hist to new token
    const p = redis.pipeline();
    p.hset(`user:${newTok}`, {
      registeredAt: user.registeredAt,
      streak: user.streak || 0,
      lastCheckin: user.lastCheckin || "",
      checkins: user.checkins || 0,
      name: user.name || "",
      thing: user.thing || "",
      bio: user.bio || "",
      css: user.css || "",
      verb: user.verb || "",
      tz: user.tz || "",
    });
    p.expire(`user:${newTok}`, ttl);

    // migrate history
    const hist = await redis.smembers(`hist:${user.tok}`);
    if (hist && hist.length) {
      p.sadd(`hist:${newTok}`, ...hist);
      p.expire(`hist:${newTok}`, ttl);
    }

    // update name index
    if (user.name) p.set(`name:tok:${user.name}`, newTok);

    // delete old token
    p.del(`user:${user.tok}`);
    p.del(`hist:${user.tok}`);

    await p.exec();

    return json({ ok: true, id: newTok });
  } catch {
    return err("server error", 500);
  }
}
