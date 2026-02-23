import { redis, json, err, limit, TTL_ANON } from "./_redis.js";

const ADJ = ["bold","brave","calm","cool","cozy","cute","dark","deep","fair","fast","free","glad","gold","hazy","keen","kind","loud","lush","mild","neat","odd","pale","raw","shy","soft","warm","wild","swift","quiet","tiny","vast","wise","zany","silly","dumb","green","orange","happy","friendly","liminal","dorky","teal"];
const NOUN = ["bear","bird","bone","cave","clay","crow","dawn","deer","dusk","fawn","fire","fish","frog","glow","hare","hawk","jade","lake","leaf","moth","mist","moss","newt","pine","reed","seed","snow","star","wren","yarn","wolf","owl","box","mouse","teddy","soy","beat","mlg","penguin","egg","oli","boo","sky","rain","stream","friend","weirdo","drawing"];
const pick = (a) => a[(Math.random() * a.length) | 0];
const genTok = () => {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return pick(ADJ) + "-" + pick(NOUN) + "-" + (1000 + ((Math.random() * 9000) | 0)) + "-" + hex;
};

// registers a user, generating the token server-side
export async function POST(req) {
  try {
    const blocked = await limit(req);
    if (blocked) return blocked;

    const now = new Date().toISOString();
    for (let i = 0; i < 10; i++) {
      const id = genTok();
      const created = await redis.hsetnx(`user:${id}`, "registeredAt", now);
      if (!created) continue;
      const p = redis.pipeline();
      p.hset(`user:${id}`, { streak: 0, lastCheckin: "", name: "" });
      p.expire(`user:${id}`, TTL_ANON);
      await p.exec();
      return json({ ok: true, id });
    }
    return err("server error", 500);
  } catch {
    return err("server error", 500);
  }
}
