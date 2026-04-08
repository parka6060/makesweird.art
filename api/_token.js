const ADJ = ["bold","brave","calm","cool","cozy","cute","dark","deep","fair","fast","free","glad","gold","hazy","keen","kind","loud","lush","mild","neat","odd","pale","raw","shy","soft","warm","wild","swift","quiet","tiny","vast","wise","zany","silly","dumb","green","orange","happy","friendly","liminal","dorky","teal"];
const NOUN = ["bear","bird","bone","cave","clay","crow","dawn","deer","dusk","fawn","fire","fish","frog","glow","hare","hawk","jade","lake","leaf","moth","mist","moss","newt","pine","reed","seed","snow","star","wren","yarn","wolf","owl","box","mouse","teddy","soy","beat","mlg","penguin","egg","oli","boo","sky","rain","stream","friend","weirdo","drawing"];
const pick = (a) => a[(Math.random() * a.length) | 0];

export const genTok = () => {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return pick(ADJ) + "-" + pick(NOUN) + "-" + (1000 + ((Math.random() * 9000) | 0)) + "-" + hex;
};
