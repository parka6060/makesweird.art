const L = localStorage,
  $ = (id) => document.getElementById(id);
let tok = L.getItem("tok");
const api = (path, body) =>
  fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + tok,
    },
    body: JSON.stringify(body),
  });
const myName = L.getItem("username") || "";
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


const grt = $("greeting"),
  nm = $("name-msg");
function showName(n) {
  grt.innerHTML = n
    ? 'you\'re <span id="uname">' + esc(n) + "</span>"
    : 'pick a <span id="uname">name</span> for the board.';
  const u = $("uname");
  u.style.cssText =
    "border-bottom:1px dashed;cursor:pointer;outline:none";
  u.title = "click to change";
  u.onclick = () => {
    if (u.isContentEditable) return;
    u.setAttribute("contenteditable", "");
    if (!n) u.textContent = "";
    else {
      const r = document.createRange();
      r.selectNodeContents(u);
      getSelection().removeAllRanges();
      getSelection().addRange(r);
    }
    u.focus();
  };
  u.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      u.blur();
    }
  };
  u.onblur = () => {
    u.removeAttribute("contenteditable");
    const raw = u.textContent
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, "")
      .slice(0, 20);
    const old = L.getItem("username");
    if (raw.length < 2) {
      nm.textContent = "2-20 chars, a-z 0-9 - _";
      u.textContent = old || "name";
      return;
    }
    if (raw === old) {
      nm.textContent = "";
      return;
    }
    nm.textContent = "saving...";
    api("/api/username", { name: raw })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          nm.textContent = d.error;
          u.textContent = old || "name";
          return;
        }
        L.setItem("username", d.name);
        nm.textContent = "";
        showName(d.name);
      })
      .catch(() => {
        nm.textContent = "error";
        u.textContent = old || "name";
      });
  };
}
showName(myName);

function renderBoard(data) {
  $("loading").style.display = "none";
  const bd = $("board");
  if (!data.board || !data.board.length) {
    bd.innerHTML =
      '<p class="empty">no one here yet. go make something.</p>';
    return;
  }
  const nameLink = n => /^anon\d+$/.test(n) ? esc(n) : '<a href="/u/' + esc(n) + '">' + esc(n) + '</a>';
  const lines = data.board.map((u, i) => {
    const r =
      '<div class="entry' +
      (u.you ? " you-row" : "") +
      '"><span class="rank sub">#' +
      (i + 1) +
      "</span>" +
      nameLink(u.name) +
      " has been making " +
      esc(u.thing) +
      " for " +
      u.streak +
      " " +
      (u.streak === 1 ? "day" : "days") +
      ".</div>";
    return r;
  });
  if (!data.board.some((u) => u.you) && data.you) {
    lines.push('<div class="entry gap">· · ·</div>');
    lines.push(
      '<div class="entry you-row"><span class="rank sub">#' +
        data.you.rank +
        "</span>" +
        nameLink(data.you.name) +
        " has been making " +
        esc(data.you.thing) +
        " for " +
        data.you.streak +
        " " +
        (data.you.streak === 1 ? "day" : "days") +
        ".</div>",
    );
  }
  bd.innerHTML =
    '<p class="sub" style="margin-bottom:.3rem">currently making</p>' +
    lines.join("");
}
if (tok) {
  const cached = sessionStorage.getItem("lb");
  if (cached)
    try {
      renderBoard(JSON.parse(cached));
    } catch (e) {}
  fetch("/api/leaderboard", {
    headers: { Authorization: "Bearer " + tok },
  })
    .then((r) => r.json())
    .then((data) => {
      sessionStorage.setItem("lb", JSON.stringify(data));
      renderBoard(data);
    })
    .catch(() => {
      $("loading").textContent = "could not load.";
    });
}

{ const _u = L.getItem("username"); if (_u) { const a = $("pnav"); if (a) { a.href = "/u/" + _u; a.hidden = false; } } }
