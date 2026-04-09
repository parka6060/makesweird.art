// $, L, esc from util.js
const un = location.pathname.split("/").filter(Boolean)[1] || "";
document.title = "mwa > " + un;
const myName = L.getItem("username") || "";
let tok = L.getItem("tok") || "";
const isOwner = myName === un;
if (tok) { const a = $("pnav"); a.href = myName ? "/u/" + myName : "/u/"; a.hidden = false; }

const api = (path, body) => fetch(path, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
  body: JSON.stringify(body),
});

// --- markdown + autolink renderer ---
// runs on pre-escaped text so HTML injection is impossible
// supports: **bold**, *italic*, # headings, - lists, --- divider, image/link URLs
function renderBio(raw) {
  const escaped = esc(raw);
  // collapse multiple blank lines into one
  const blocks = escaped.replace(/\n{3,}/g, "\n\n").split("\n\n");
  const out = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (!lines[0]) continue;

    // heading (first line of block)
    const hm = lines[0].match(/^(#{1,3})\s+(.*)/);
    if (hm) {
      const lvl = hm[1].length + 2;
      out.push("<h" + lvl + ">" + inline(hm[2]) + "</h" + lvl + ">");
      continue;
    }

    // divider
    if (/^---+$/.test(lines[0].trim())) {
      out.push("<hr>");
      continue;
    }

    // list block
    if (/^[-*]\s/.test(lines[0])) {
      out.push("<ul>" + lines.map(l => {
        const lm = l.match(/^[-*]\s+(.*)/);
        return lm ? "<li>" + inline(lm[1]) + "</li>" : "";
      }).join("") + "</ul>");
      continue;
    }

    // paragraph
    out.push("<p>" + lines.map(inline).join("<br>") + "</p>");
  }

  return out.join("");
}

// inline: bold, italic, images, links
function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/(https?:\/\/[^\s<"]+)/g, url =>
      /\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s"]*)?$/i.test(url)
        ? '<img src="' + url + '" style="max-width:100%;display:block;margin:.5rem auto" alt="">'
        : '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>"
    );
}

function parseLinks(text) {
  return (text || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.*?)\s*(https?:\/\/[^\s"]+)$/);
    if (!m) return null;
    return { label: m[1].trim() || m[2], url: m[2] };
  }).filter(Boolean);
}

function since(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();
}

const TA = "width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px dashed #271a0840;font:inherit;font-size:.85rem;color:inherit;outline:none;resize:vertical;padding:2px 0;display:block";

if (!un) {
  if (!tok) {
    $("main").innerHTML = "<p class='sub'>nothing here.</p>";
  } else {
    $("main").innerHTML =
      "<p id='tagline'><strong id='uname' class='sub'>click to set username</strong> makes weird art.</p>" +
      "<p id='name-msg' style='font-size:.75rem;color:#b33;margin:.25rem 0'></p>" +
      "<p class='sub'>your profile page will live here once you set a username.</p>" +
      "<p style='margin:.8rem 0 .2rem'><span id='kl' class='sub' style='cursor:pointer;font-size:.8rem'>your key ···</span></p>" +
      "<div id='key-body' hidden style='font-size:.8rem'>" +
      "<p style='margin:0 0 .4rem;color:#b33;font-size:.75rem'>⚠ save this key somewhere safe. it's the only way to recover your account — there's no email reset.</p>" +
      "<span id='ktok' style='cursor:pointer'>" + esc(tok) + "</span>" +
      " <span id='km' style='font-size:.9em'></span>" +
      "</div>";
    setupNameEdit("");
    setupKey();
  }
  throw null;
}

fetch("/api/user?u=" + encodeURIComponent(un))
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(u => {
    if (u.css) {
      const s = document.createElement("style");
      s.textContent = u.css;
      document.head.appendChild(s);
    }
    if (isOwner) {
      const s = document.createElement("style");
      s.textContent = ".key-area{display:block!important;visibility:visible!important;opacity:1!important}";
      document.head.appendChild(s);
    }

    const dotsHtml = renderDotGrid(u.hist || [], true);
    const sinceStr = u.since ? "since " + since(u.since) : "";

    let html =
      "<p id='tagline'><strong id='uname'>" + esc(u.name) + "</strong> makes <strong id='thing'>" + esc(u.thing) + "</strong>.</p>";

    if (u.bio)
      html += "<div id='bio'>" + renderBio(u.bio) + "</div>";
    else if (isOwner)
      html += "<div id='bio' class='sub' style='cursor:pointer'>add a bio...</div>";
    if (isOwner)
      html += "<span id='bio-counter' class='sub' style='font-size:.7rem' hidden></span>";

    const linkItems = parseLinks(u.links);
    if (linkItems.length || isOwner) {
      html += "<ul id='links' style='list-style:none;padding:0;margin:.5rem 0'>" +
        linkItems.map(l =>
          "<li><a href='" + esc(l.url).replace(/'/g, "%27") + "' target='_blank' rel='noopener noreferrer'>" + esc(l.label) + "</a></li>"
        ).join("") +
        "</ul>";
    }

    if (dotsHtml)
      html += "<div id='dots'>" + dotsHtml + "</div>";

    html +=
      "<p class='sub'>streak: " + u.streak + " · " + u.checkins + " logged" +
      (sinceStr ? "</p><p class='sub'>" + sinceStr : "") + "</p>" +
      "<p><span id='plink' style='cursor:pointer;border-bottom:1px dashed' title='click to copy'>" +
      esc(u.name) + ".makesweird.art</span></p>";

    if (isOwner) {
      html +=
        "<div class='key-area'>" +
        "<p id='name-msg' style='font-size:.75rem;color:#b33;margin:0 0 .4rem'></p>" +
        "<p style='margin:0 0 .3rem'><span id='links-toggle' class='sub' style='cursor:pointer;font-size:.8rem'>links ···</span></p>" +
        "<div id='links-area' hidden>" +
        "<textarea id='links-inp' rows='4' maxlength='800' placeholder='instagram https://instagram.com/you' style='" + TA + ";font-size:.75rem'>" + esc(u.links || "") + "</textarea>" +
        "</div>" +
        "<p style='margin:0 0 .3rem'><span id='css-toggle' class='sub' style='cursor:pointer;font-size:.8rem'>custom css ···</span> <span id='css-count' class='sub' style='font-size:.75rem' hidden></span></p>" +
        "<div id='css-area' hidden>" +
        "<textarea id='css-inp' rows='5' maxlength='2048' placeholder='body { background: hotpink; }' style='" + TA + ";font-size:.75rem'>" + esc(u.css) + "</textarea>" +
        "<p class='sub' style='font-size:.65rem;margin:.2rem 0 0;line-height:1.6'><a href='/css-guide' style='color:inherit'>css guide</a> · <span id='blink' style='cursor:pointer;border-bottom:1px dashed;color:inherit'>copy badge embed</span></p>" +
        "<p id='profile-msg' style='font-size:.75rem;color:#b33;margin:.1rem 0 0'></p>" +
        "</div>" +
        "<p style='margin:.4rem 0 .2rem'><span id='kl' class='sub' style='cursor:pointer;font-size:.8rem'>your key ···</span></p>" +
        "<div id='key-body' hidden style='font-size:.8rem'>" +
        "<p style='margin:0 0 .4rem;color:#b33;font-size:.75rem'>!!! save this key somewhere safe. it's the only way to recover your account. there's no email reset. !!!</p>" +
        "<span id='ktok' style='cursor:pointer'>" + esc(tok) + "</span>" +
        " <span id='km' style='font-size:.9em'></span>" +
        "</div>" +
        "</div>";
    }

    $("main").innerHTML = html;

    $("plink").onclick = () => {
      navigator.clipboard.writeText("https://" + u.name + ".makesweird.art");
      const el = $("plink"), p = el.textContent;
      el.textContent = "copied!";
      setTimeout(() => el.textContent = p, 1200);
    };

    if (isOwner) {
      setupNameEdit(u.name);
      setupThingEdit(u.thing);
      setupBioEdit(u.bio);
      setupLinks(u.links || "");
      setupCSS(u.css);
      setupKey();
    }
  })
  .catch(s => {
    if (s === null) return;
    $("main").innerHTML =
      "<p>" + (s === 404 ? un + " hasn't made it here yet." : "something went wrong.") + "</p>";
  });

function setupThingEdit(initThing) {
  const el = $("thing");
  let cur = initThing;
  el.title = "click to change";
  el.style.cssText = "border-bottom:1px dashed;cursor:pointer;outline:none";
  el.onclick = () => {
    if (el.isContentEditable) return;
    el.setAttribute("contenteditable", "");
    const r = document.createRange();
    r.selectNodeContents(el);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    el.focus();
  };
  el.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); el.blur(); } };
  el.onblur = () => {
    el.removeAttribute("contenteditable");
    const raw = el.textContent.replace(/[^a-zA-Z0-9 .,!?'\-]/g, "").trim().slice(0, 40);
    if (!raw) { el.textContent = cur; return; }
    if (raw === cur) return;
    cur = raw;
    el.textContent = cur;
    api("/api/thing", { thing: cur }).catch(() => {});
  };
}

function setupBioEdit(initBio) {
  const bioDiv = $("bio"), counter = $("bio-counter");
  let cur = initBio || "";

  // replace bioDiv with a textarea on click, restore on blur
  bioDiv.title = "click to edit";
  bioDiv.onclick = () => {
    const ta = document.createElement("textarea");
    ta.value = cur;
    ta.style.cssText = TA + ";min-height:6rem";
    ta.maxLength = 777;
    counter.textContent = (777 - cur.length) + " left";
    counter.hidden = false;
    bioDiv.replaceWith(ta);
    ta.id = "bio";
    ta.focus();

    ta.oninput = () => {
      counter.textContent = (777 - ta.value.length) + " left";
    };

    ta.onblur = () => {
      counter.hidden = true;
      const text = ta.value.trim().slice(0, 777);
      const div = document.createElement("div");
      div.id = "bio";
      div.title = "click to edit";
      if (!text) {
        div.className = "sub";
        div.textContent = "add a bio...";
        cur = "";
      } else {
        div.innerHTML = renderBio(text);
        if (text !== cur) {
          cur = text;
          api("/api/profile", { bio: text }).catch(() => {});
        }
      }
      ta.replaceWith(div);
      setupBioEdit(cur);
    };
  };
}

function setupLinks(_) {
  const toggle = $("links-toggle"), area = $("links-area"), inp = $("links-inp");
  toggle.onclick = () => {
    area.hidden = !area.hidden;
    toggle.textContent = area.hidden ? "links ···" : "links ▾";
  };
  let saveTimer;
  inp.oninput = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api("/api/profile", { links: inp.value }).then(() => {
        const ul = $("links");
        if (ul) ul.innerHTML = parseLinks(inp.value).map(l =>
          "<li><a href='" + esc(l.url).replace(/'/g, "%27") + "' target='_blank' rel='noopener noreferrer'>" + esc(l.label) + "</a></li>"
        ).join("");
      }).catch(() => {});
    }, 800);
  };
}

function setupCSS(initCSS) {
  const toggle = $("css-toggle"), area = $("css-area");
  const cssInp = $("css-inp"), cssCount = $("css-count"), msg = $("profile-msg");
  cssCount.textContent = (initCSS || "").length + "/2048";
  $("blink").onclick = () => {
    const code = '<iframe src="https://makesweird.art/u/' + un + '/badge" width="380" height="110" frameborder="0" scrolling="no"></iframe>';
    navigator.clipboard.writeText(code);
    const el = $("blink"), p = el.textContent;
    el.textContent = "copied!";
    setTimeout(() => el.textContent = p, 1200);
  };
  toggle.onclick = () => {
    area.hidden = !area.hidden;
    toggle.textContent = area.hidden ? "custom css ···" : "custom css ▾";
    cssCount.hidden = area.hidden;
  };
  let saveTimer;
  cssInp.oninput = () => {
    cssCount.textContent = cssInp.value.length + "/2048";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api("/api/profile", { css: cssInp.value })
        .then(r => r.json())
        .then(d => {
          if (d.error) { msg.textContent = d.error; return; }
          msg.textContent = "saved.";
          setTimeout(() => msg.textContent = "", 1200);
          let s = document.querySelector("style[data-user]");
          if (!s) { s = document.createElement("style"); s.dataset.user = "1"; document.head.appendChild(s); }
          s.textContent = cssInp.value;
        })
        .catch(() => msg.textContent = "error");
    }, 800);
  };
}

function setupKey() {
  const kl = $("kl"), body = $("key-body"), km = $("km");
  const ktok = $("ktok");
  ktok.textContent = "click to reveal";
  ktok.style.color = "inherit";
  let revealed = false;
  ktok.onclick = () => {
    if (!revealed) {
      ktok.textContent = tok;
      ktok.style.color = "#3a6a9b";
      revealed = true;
      return;
    }
    navigator.clipboard.writeText(tok);
    const p = ktok.textContent;
    ktok.textContent = "copied!";
    setTimeout(() => ktok.textContent = p, 1200);
  };
  km.innerHTML = "<a href='#' id='ki'>import a different key</a> · <a href='#' id='kr'>regenerate</a>";
  $("ki").onclick = e => { e.preventDefault(); doImport(km); };
  $("kr").onclick = e => {
    e.preventDefault();
    if (!confirm("this will invalidate your current key. make sure you save the new one. continue?")) return;
    km.textContent = "regenerating...";
    api("/api/rekey", {}).then(r => r.json()).then(d => {
      if (d.error) { km.textContent = d.error; return; }
      tok = d.id;
      L.setItem("tok", d.id);
      ktok.textContent = d.id;
      ktok.style.color = "#3a6a9b";
      revealed = true;
      km.textContent = "done! copy your new key above.";
    }).catch(() => km.textContent = "error");
  };
  kl.onclick = () => {
    const open = !body.hidden;
    body.hidden = open;
    kl.textContent = open ? "your key ···" : "your key ▾";
  };
}

function doImport(km) {
  km.innerHTML = "paste key: <span id='kinp' style='border-bottom:1px dashed;outline:none' contenteditable></span>";
  const inp = $("kinp");
  inp.focus();
  inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } };
  inp.onblur = () => {
    const raw = inp.textContent.trim();
    if (!raw || raw.length < 20) { km.textContent = "invalid key"; return; }
    km.textContent = "checking...";
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: raw }),
    }).then(r => r.json()).then(d => {
      if (d.error) { km.textContent = d.error; return; }
      L.setItem("tok", raw);
      if (d.name) L.setItem("username", d.name);
      if (d.thing) L.setItem("t", d.thing);
      if (d.lastCheckin) L.setItem("d", d.lastCheckin);
      L.setItem("n", d.streak);
      if (d.hist && d.hist.length) L.setItem("h", JSON.stringify(d.hist));
      km.textContent = "imported! reloading...";
      setTimeout(() => { location.href = d.name ? "/u/" + d.name : "/u/"; }, 800);
    }).catch(() => km.textContent = "error");
  };
}

function setupNameEdit(cur) {
  const nm = $("name-msg"), u = $("uname");
  u.style.cssText = "border-bottom:1px dashed;cursor:pointer;outline:none";
  u.title = "click to change";
  u.onclick = () => {
    if (u.isContentEditable) return;
    u.setAttribute("contenteditable", "");
    const r = document.createRange();
    r.selectNodeContents(u);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    u.focus();
  };
  u.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); u.blur(); } };
  u.onblur = () => {
    u.removeAttribute("contenteditable");
    const raw = u.textContent.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, "").slice(0, 20);
    if (raw.length < 2) { nm.textContent = "2-20 chars, a-z 0-9 - _"; u.textContent = cur; return; }
    if (raw === cur) { nm.textContent = ""; return; }
    nm.textContent = "saving...";
    api("/api/username", { name: raw }).then(r => r.json()).then(d => {
      if (d.error) { nm.textContent = d.error; u.textContent = cur; return; }
      L.setItem("username", d.name);
      const pnav = $("pnav");
      if (pnav) { pnav.href = "/u/" + d.name; pnav.hidden = false; }
      if (!cur) { location.href = "/u/" + d.name; return; }
      cur = d.name;
      nm.textContent = "";
      const pl = $("plink");
      if (pl) pl.textContent = d.name + ".makesweird.art";
    }).catch(() => { nm.textContent = "error"; u.textContent = cur; });
  };
}
