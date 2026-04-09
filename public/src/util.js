const L = localStorage, $ = id => document.getElementById(id);
const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function localDate(s) { const [y, m, d] = s.split("-"); return new Date(y, m - 1, d); }
function renderDots(hist) {
  if (!hist.length) return "";
  const on = new Set(hist), sorted = [...on].sort();
  let h = "", m = 0;
  for (let d = localDate(sorted[0]); d <= localDate(sorted[sorted.length - 1]); d.setDate(d.getDate() + 1)) {
    const ds = d.toLocaleDateString("en-CA");
    if (on.has(ds)) { h += "●"; m = 0; }
    else { m++; h += m >= 2 ? "×" : "·"; }
  }
  return h;
}
function renderDotGrid(hist, toToday) {
  if (!hist.length) return "";
  const on = new Set(hist), sorted = [...on].sort();
  const today = new Date().toLocaleDateString("en-CA");
  const end = toToday ? today : sorted[sorted.length - 1];
  const spans = [];
  let miss = 0;
  for (let d = localDate(sorted[0]); d <= localDate(end); d.setDate(d.getDate() + 1)) {
    const ds = d.toLocaleDateString("en-CA");
    if (on.has(ds)) { spans.push('<span class="d">●</span>'); miss = 0; }
    else { miss++; if (miss > 14) continue; spans.push('<span class="d">' + (miss >= 2 ? "×" : "·") + '</span>'); }
  }
  return spans.join("");
}
const sanThing = s => (s || "").replace(/[^a-zA-Z0-9 .,!?'\-]/g, "").trim().slice(0, 40) || "weird art";
function initNav() {
  const u = L.getItem("username"), t = L.getItem("tok");
  if (t) { const a = $("pnav"); if (a) { a.href = u ? "/u/" + u : "/u/"; a.hidden = false; } }
}
