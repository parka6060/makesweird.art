const $ = (id) => document.getElementById(id),
  L = localStorage;
const H = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 0xffff).toString(36);
};
let tok = L.getItem("tok");
const _registered = tok
  ? Promise.resolve()
  : fetch("/api/register", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.id) { tok = d.id; L.setItem("tok", tok); } })
      .catch(() => {});
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
  const main = $("main");
  if (sig !== H(payload)) {
    main.innerHTML = "<p>nice try.</p>";
  } else {
    const p = document.createElement("p");
    p.append(who || "someone", " made ", thing, document.createElement("br"));
    p.append("for ", n, " ", n === "1" ? "day" : "days", " straight.");
    main.replaceChildren(p);
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
    t.contentEditable = true;
    t.focus();
    getSelection().selectAllChildren(t);
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
  const localDate = (s) => { const [y,m,d] = s.split("-"); return new Date(y,m-1,d); };
  let doneToday = last === today;
  function renderDots() {
    if (!hist.length && !streak && !last) {
      dots.textContent = "";
      return;
    }
    const on = new Set(hist);
    // backfill missing dates only if hist is shorter than streak.
    // this handles the edge case where history data is missing because
    // check-ins were tracked differently in the past.
    if (streak > on.size && hist.length) {
      const end = localDate(hist[hist.length - 1]);
      for (let i = 1; on.size < streak; i++) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        on.add(d.toLocaleDateString("en-CA"));
      }
    }
    if (!on.size) {
      dots.textContent = doneToday ? "" : "○";
      return;
    }
    const sorted = [...on].sort();
    const loopEnd = doneToday ? sorted[sorted.length - 1] : today;
    let m = 0,
      h = "";
    for (
      let d = localDate(sorted[0]);
      d <= localDate(loopEnd);
      d.setDate(d.getDate() + 1)
    ) {
      const ds = d.toLocaleDateString("en-CA");
      if (on.has(ds)) { h += "●"; m = 0; }
      else if (ds === today && !doneToday) h += "○";
      else { m++; h += m >= 2 ? "×" : "·"; }
    }
    dots.textContent = h;
  }
  renderDots();
  function applyState(serverToday, checkedIn) {
    doneToday = checkedIn;
    tag.textContent = streak ? `(x${streak})` : "";
    if (checkedIn) {
      sub.textContent = "nice. see you tomorrow.";
      c.checked = c.disabled = true;
      l.style.opacity = 0.4;
      mk.textContent = "made";
    } else {
      const gap = last
        ? Math.round((localDate(serverToday) - localDate(last)) / 864e5)
        : 0;
      if (gap >= 3) {
        streak = 0;
        tag.textContent = "";
        sub.textContent = "it's okay. start again whenever you're ready.";
      } else if (gap === 2) {
        sub.textContent = "missed a day \u2014 you still got this.";
      } else {
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
  const since = hist.length ? "?since=" + hist[hist.length - 1] : "";
  _registered.then(() => fetch("/api/sync" + since, { headers: { Authorization: "Bearer " + tok } }))
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
    const last = L.getItem("d") || "";
    const gap = last
      ? Math.round((localDate(today) - localDate(last)) / 864e5)
      : 0;
    streak = gap <= 2 ? streak + 1 : 1;
    hist.push(today);
    L.setItem("d", today);
    L.setItem("n", streak);
    L.setItem("h", JSON.stringify(hist));
    applyState(today, true);
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
