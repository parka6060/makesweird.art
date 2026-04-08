// $, L, esc from util.js
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
        initNav();
      })
      .catch(() => {
        nm.textContent = "error";
        u.textContent = old || "name";
      });
  };
}
showName(myName);

const nameLink = n => /^anon\d+$/.test(n) ? esc(n) : '<a href="/u/' + esc(n) + '">' + esc(n) + '</a>';

function renderBoard(data) {
  $("loading").style.display = "none";
  const bd = $("board");

  if (!data.board?.length && !data.recentBoard?.length && !data.checkinsBoard?.length) {
    bd.innerHTML = '<p class="empty">no one here yet. go make something.</p>';
    return;
  }

  let html = "";

  // --- currently making (streaks) ---
  if (data.board?.length) {
    html += '<p class="sub" style="margin-bottom:.3rem">currently making</p>';
    html += streakRows(data.board);
    if (!data.board.some(u => u.you) && data.you) {
      html += '<div class="entry gap">· · ·</div>';
      html += '<div class="entry you-row"><span class="rank sub">#' + data.you.rank + '</span>' +
        nameLink(data.you.name) + " has been making " + esc(data.you.thing) +
        " for " + data.you.streak + " " + (data.you.streak === 1 ? "day" : "days") + ".</div>";
    }
  }

  // --- just checked in ---
  if (data.recentBoard?.length) {
    html += '<hr style="border:none;border-top:1px dashed;opacity:.15;margin:1rem 0">';
    html += '<p class="sub" style="margin:0 0 .3rem">just checked in</p>';
    html += data.recentBoard.map(u =>
      '<div class="entry norank' + (u.you ? " you-row" : "") + '">' +
      nameLink(u.name) + ' <span class="sub">' + (u.today ? "just now" : "yesterday") + '</span></div>'
    ).join("");
  }

  // --- total check-ins ---
  if (data.checkinsBoard?.length) {
    html += '<hr style="border:none;border-top:1px dashed;opacity:.15;margin:1rem 0">';
    html += '<p class="sub" style="margin:0 0 .3rem">total check-ins</p>';
    html += data.checkinsBoard.map((u, i) =>
      '<div class="entry' + (u.you ? " you-row" : "") + '"><span class="rank sub">#' +
      (i + 1) + '</span>' + nameLink(u.name) + " · " + u.checkins +
      " " + (u.checkins === 1 ? "check-in" : "check-ins") + "</div>"
    ).join("");
    if (!data.checkinsBoard.some(u => u.you) && data.youCheckins) {
      html += '<div class="entry gap">· · ·</div>';
      html += '<div class="entry you-row"><span class="rank sub">#' + data.youCheckins.rank + '</span>' +
        nameLink(data.youCheckins.name) + " · " + data.youCheckins.checkins +
        " " + (data.youCheckins.checkins === 1 ? "check-in" : "check-ins") + "</div>";
    }
  }

  bd.innerHTML = html;
}

function streakRows(board) {
  return board.map((u, i) =>
    '<div class="entry' + (u.you ? " you-row" : "") + '"><span class="rank sub">#' +
    (i + 1) + "</span>" + nameLink(u.name) + " has been making " +
    esc(u.thing) + " for " + u.streak + " " + (u.streak === 1 ? "day" : "days") + ".</div>"
  ).join("");
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

initNav();
