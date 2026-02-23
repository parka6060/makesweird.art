const L = localStorage,
  $ = (id) => document.getElementById(id);
const tok = L.getItem("tok") || "";
const myName = L.getItem("username") || "";
const msgs = $("msgs"),
  inp = $("inp"),
  cc = $("cc");
let lastSig = null,
  lastData = [],
  authed = false;

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function fmt(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function render(data) {
  const sig = data.map((m) => m.ts).join("");
  if (sig === lastSig) return;
  const atBottom =
    msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 60;
  lastSig = sig;
  lastData = data;
  if (!data.length) {
    msgs.innerHTML = '<p class="sub">no messages yet.</p>';
    return;
  }
  let lastDay = "",
    html =
      data.length >= 256
        ? '<p class="sub" style="text-align:center">only the latest 256 messages are kept.</p>'
        : "";
  for (const m of data) {
    const day = new Date(m.ts).toLocaleDateString("en-CA");
    if (day !== lastDay) {
      const label = new Date(m.ts).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
      html += '<p class="day">' + label + "</p>";
      lastDay = day;
    }
    const me = m.n === myName;
    if (m.share) {
      html +=
        '<p class="m share"><span class="mt">' +
        fmt(m.ts) +
        '</span><span class="mc">' +
        esc(m.t) +
        "</span></p>";
    } else {
      html +=
        '<p class="m' +
        (me ? " me" : "") +
        '"><span class="mt">' +
        fmt(m.ts) +
        '</span><span class="mc"><span class="mn">' +
        esc(m.n) +
        ":</span> " +
        esc(m.t) +
        "</span></p>";
    }
  }
  msgs.innerHTML = html;
  if (atBottom) msgs.scrollTop = msgs.scrollHeight;
}

// --- PartyKit WebSocket ---
const PARTY_HOST = "makesweirdart-chat.parka6060.partykit.dev";
let ws,
  wsRetry = 1000,
  wsAttempts = 0;
function connectWS() {
  authed = false;
  wsAttempts++;
  ws = new WebSocket("wss://" + PARTY_HOST + "/party/main");
  ws.onopen = () => {
    wsRetry = 1000;
    wsAttempts = 0;
    // authenticate
    if (tok) ws.send(JSON.stringify({ t: "a", tok }));
  };
  ws.onmessage = (e) => {
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      return;
    }
    if (data.t === "h") {
      lastData = data.msgs || [];
      render(lastData);
    } else if (data.t === "m") {
      lastData = [...lastData, data.msg].slice(-256);
      render(lastData);
    } else if (data.t === "clear") {
      lastSig = null;
      lastData = [];
      render([]);
    } else if (data.t === "ok") {
      authed = true;
      if (data.admin) initAdmin();
    }
  };
  ws.onclose = () => {
    if (wsAttempts >= 5) {
      inp.disabled = true;
      inp.placeholder = "chat is currently offline";
      msgs.innerHTML = '<p class="sub">chat temporarily unavailable.</p>';
      return;
    }
    setTimeout(connectWS, wsRetry);
    wsRetry = Math.min(wsRetry * 2, 15000);
  };
  ws.onerror = () => {
    ws.close();
  };
}
connectWS();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && (!ws || ws.readyState > 1)) connectWS();
});

let isAdmin = false;
function initAdmin() {
  isAdmin = true;
  const cb = $("clear-btn");
  cb.style.display = "";
  cb.onclick = () => {
    if (!confirm("clear all messages?")) return;
    if (ws && ws.readyState === 1)
      ws.send(JSON.stringify({ t: "nuke." }));
  };
}

if (!myName) {
  inp.disabled = true;
  inp.placeholder = "set a username on leaderboard to chat!";
}

inp.oninput = () => (cc.textContent = 256 - inp.value.length);
inp.onkeydown = (e) => {
  if (e.key !== "Enter" || e.shiftKey || inp.disabled) return;
  e.preventDefault();
  const text = inp.value.trim();
  if (!text) return;

  // admin commands
  const ban = text.match(/^\/(un)?ban\s+(\S+)/);
  if (ban) {
    if (!isAdmin) return;
    inp.value = "";
    cc.textContent = 256;
        "Content-Type": "application/json",
        Authorization: "Bearer " + tok,
      },
      body: JSON.stringify({ name: ban[2], unban: !!ban[1] }),
    }).then((r) => r.json());
    return;
  }

  if (!ws || ws.readyState !== 1) return;
  if (!authed) return;
  ws.send(JSON.stringify({ t: "m", text }));
  inp.value = "";
  cc.textContent = 256;
};
