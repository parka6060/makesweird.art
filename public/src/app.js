// $ and L from util.js
let tok = L.getItem("tok");
const _registered = tok
  ? Promise.resolve()
  : fetch("/api/register", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.id) { tok = d.id; L.setItem("tok", tok); initNav(); } })
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

{
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
  const save = (v) => {
    const val = sanThing(v);
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
      api("/api/thing", { thing: sanThing(t.textContent) }).catch(() => {});
  };
  t.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      t.blur();
    }
  };
  let doneToday = last === today;
  function renderDots() {
    if (!hist.length && !streak && !last) {
      dots.innerHTML = "";
      return;
    }
    // backfill missing dates only if hist is shorter than streak
    const filled = [...hist];
    if (streak > new Set(filled).size && filled.length) {
      const on = new Set(filled);
      const end = localDate(filled[filled.length - 1]);
      for (let i = 1; on.size < streak; i++) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const ds = d.toLocaleDateString("en-CA");
        if (!on.has(ds)) { on.add(ds); filled.push(ds); }
      }
    }
    if (!filled.length) {
      dots.innerHTML = doneToday ? "" : '<span class="d">○</span>';
      return;
    }
    // show grid up to last check-in, then add ○ for today if not checked in
    let html = renderDotGrid(filled);
    if (!doneToday) html += '<span class="d">○</span>';
    dots.innerHTML = html;
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
        sub.textContent = "it's okay. start again whenever you're ready.";
      } else if (gap === 2) {
        sub.textContent = "missed a day, but you still got this.";
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
    api("/api/checkin", { thing: sanThing(t.textContent) })
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
    const name = L.getItem("username") || "";
    if (!name) return;
    navigator.clipboard.writeText("https://" + name + ".makesweird.art");
    const prev = tag.textContent;
    tag.textContent = "copied!";
    setTimeout(() => (tag.textContent = prev), 1200);
  };
}
initNav();
