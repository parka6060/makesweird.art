const $ = (id) => document.getElementById(id),
  L = localStorage;
const H = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 0xffff).toString(36);
};
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ADJ = [
  "bold",
  "brave",
  "calm",
  "cool",
  "cozy",
  "cute",
  "dark",
  "deep",
  "fair",
  "fast",
  "free",
  "glad",
  "gold",
  "hazy",
  "keen",
  "kind",
  "loud",
  "lush",
  "mild",
  "neat",
  "odd",
  "pale",
  "raw",
  "shy",
  "soft",
  "warm",
  "wild",
  "swift",
  "quiet",
  "tiny",
  "vast",
  "wise",
  "zany",
  "silly",
  "dumb",
  "green",
  "orange",
  "happy",
  "friendly",
  "liminal",
  "dorky",
  "teal",
];
const NOUN = [
  "bear",
  "bird",
  "bone",
  "cave",
  "clay",
  "crow",
  "dawn",
  "deer",
  "dusk",
  "fawn",
  "fire",
  "fish",
  "frog",
  "glow",
  "hare",
  "hawk",
  "jade",
  "lake",
  "leaf",
  "moth",
  "mist",
  "moss",
  "newt",
  "pine",
  "reed",
  "seed",
  "snow",
  "star",
  "wren",
  "yarn",
  "wolf",
  "owl",
  "box",
  "mouse",
  "teddy",
  "soy",
  "beat",
  "mlg",
  "penguin",
  "egg",
  "oli",
  "boo",
  "sky",
  "rain",
  "stream",
  "friend",
  "weirdo",
  "drawing",
];

const hex = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
let tok = L.getItem("tok");
if (!tok) {
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const gen = () =>
    pick(ADJ) +
    "-" +
    pick(NOUN) +
    "-" +
    (1000 + ((Math.random() * 9000) | 0)) +
    "-" +
    hex();
  tok = gen();
  L.setItem("tok", tok);
  (async () => {
    for (let i = 0; i < 5; i++) {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tok }),
      });
      const d = await r.json();
      if (d.ok) return;
      if (d.error === "taken") {
        tok = gen();
        L.setItem("tok", tok);
        continue;
      }
      return;
    }
  })();
}
const api = (path, body) =>
  fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + tok,
    },
    body: JSON.stringify(body),
  });

if (location.hash.startsWith("#x")) {
  const [b, sig] = location.hash.slice(1).split("."),
    p = b.split(":");
  const n = p[0].slice(1),
    hasName = p.length > 2;
  const who = hasName ? decodeURIComponent(p[p.length - 1]) : "";
  const thing = decodeURIComponent(
    p.slice(1, hasName ? -1 : undefined).join(":") || "weird art",
  );
  const payload = who ? n + ":" + thing + ":" + who : n + ":" + thing;
  const dw = n === "1" ? "day" : "days";
  if (sig !== H(payload)) {
    $("main").innerHTML = "<p>nice try.</p>";
  } else {
    $("main").innerHTML =
      "<p>" +
      esc(who || "someone") +
      " made " +
      esc(thing) +
      "<br>for " +
      esc(n) +
      " " +
      dw +
      " straight.</p>";
  }
} else {
  const t = $("t"),
    t2 = $("t2"),
    c = $("c"),
    l = $("l"),
    sub = $("sub"),
    tag = $("tag"),
    dots = $("dots"),
    mk = $("mk");
  const today = new Date().toLocaleDateString("en-CA");
  const last = L.getItem("d");
  let streak = +L.getItem("n") || 0,
    hist = JSON.parse(L.getItem("h") || "[]");
  const san = (s) =>
    (s || "")
      .replace(/[^a-zA-Z0-9 .,!?'\-]/g, "")
      .replace(/[\x00-\x1f]/g, "")
      .trim()
      .slice(0, 40) || "weird art";
  const save = (v) => {
    const val = san(v);
    t.textContent = t2.textContent = val;
    L.setItem("t", val);
  };
  save(L.getItem("t") ?? "weird art");
  t.onclick = () => {
    if (t.isContentEditable) return;
    t.setAttribute("contenteditable", "");
    t.focus();
    const r = document.createRange();
    r.selectNodeContents(t);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  };
  t.onblur = () => {
    t.removeAttribute("contenteditable");
    save(t.textContent.trim());
    if (doneToday)
      api("/api/thing", { thing: san(t.textContent) }).catch(() => {});
  };
  t.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      t.blur();
    }
  };
  const localDate = (s) => {
    const [y, m, d] = s.split("-");
    return new Date(y, m - 1, d);
  };
  let doneToday = last === today;
  function renderDots() {
    if (!hist.length && !streak) {
      dots.innerHTML = "";
      return;
    }
    // backfill missing dates only if hist is shorter than streak (UTC transition fix)
    const on = new Set(hist);
    if (streak > on.size && hist.length) {
      const end = localDate(hist[hist.length - 1]);
      for (let i = 1; on.size < streak; i++) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        on.add(d.toLocaleDateString("en-CA"));
      }
    }
    const sorted = [...on].sort();
    let m = 0,
      h = "";
    for (
      let d = localDate(sorted[0]);
      d <= localDate(sorted[sorted.length - 1]);
      d.setDate(d.getDate() + 1)
    ) {
      const ds = d.toLocaleDateString("en-CA");
      if (on.has(ds)) {
        h += "<span class=on></span>";
        m = 0;
      } else {
        m++;
        h += "<span" + (m >= 2 ? " class=x" : "") + "></span>";
      }
    }
    if (!doneToday) h += "<span></span>";
    dots.innerHTML = h;
  }
  renderDots();
  tag.textContent = streak ? `(x${streak})` : "";
  tag.title = streak ? "click to copy share link" : "";
  function applyState(serverToday, checkedIn) {
    doneToday = checkedIn;
    tag.textContent = streak ? `(x${streak})` : "";
    if (checkedIn) {
      sub.textContent = "nice. see you tomorrow.";
      c.checked = c.disabled = true;
      l.style.opacity = 0.4;
      mk.textContent = "made";
    } else {
      const last = L.getItem("d") || "";
      const gap = last
        ? Math.round((localDate(serverToday) - localDate(last)) / 864e5)
        : 0;
      if (gap >= 3) {
        streak = 0;
        tag.textContent = "";
      }
      if (gap >= 3)
        sub.textContent = "it's okay. start again whenever you're ready.";
      else if (gap === 2)
        sub.textContent = "missed a day \u2014 you still got this.";
      else {
        sub.textContent = "use your hands. keep it simple.";
      }
      c.checked = c.disabled = false;
      l.style.opacity = 1;
      mk.textContent = "making";
    }
    renderDots();
  }
  // initial render from localStorage (fast, assume not checked in yet)
  applyState(today, last === today);
  // then reconcile with server (authoritative)
  fetch("/api/sync", { headers: { Authorization: "Bearer " + tok } })
    .then((r) => r.json())
    .then((d) => {
      const serverToday = d.today || today;
      if (d.streak != null) {
        streak = +d.streak;
        L.setItem("n", streak);
      }
      if (d.lastCheckin) L.setItem("d", d.lastCheckin);
      if (d.hist && d.hist.length) {
        hist = [...new Set([...hist, ...d.hist])].sort();
      }
      L.setItem("h", JSON.stringify(hist));
      applyState(serverToday, !!d.checkedIn);
    })
    .catch(() => {});
  c.onchange = () => {
    if (!c.checked) return;
    const last = L.getItem("d") || "";
    const gap = last
      ? Math.round((localDate(today) - localDate(last)) / 864e5)
      : 0;
    streak = gap <= 2 ? streak + 1 : 1;
    hist.push(today);
    L.setItem("d", today);
    L.setItem("n", streak);
    L.setItem("h", JSON.stringify(hist));
    c.disabled = true;
    l.style.opacity = 0.4;
    mk.textContent = "made";
    doneToday = true;
    sub.textContent = "nice. see you tomorrow.";
    tag.textContent = `(x${streak})`;
    renderDots();
    api("/api/checkin", { thing: san(t.textContent) })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.streak != null && d.streak !== streak) {
          streak = d.streak;
          L.setItem("n", streak);
          tag.textContent = streak ? `(x${streak})` : "";
        }
        if (d.today) L.setItem("d", d.today);
      })
      .catch(() => {});
  };
  tag.onclick = () => {
    if (streak < 1) return;
    const name = L.getItem("username") || "",
      thing = encodeURIComponent(t.textContent);
    const payload = streak + ":" + t.textContent + (name ? ":" + name : "");
    const sig = H(payload),
      nameEnc = name ? ":" + encodeURIComponent(name) : "";
    navigator.clipboard.writeText(
      location.origin + "#x" + streak + ":" + thing + nameEnc + "." + sig,
    );
    const prev = tag.textContent;
    tag.textContent = "copied!";
    setTimeout(() => (tag.textContent = prev), 1200);
  };
}
