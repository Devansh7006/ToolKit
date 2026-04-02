/* ==========================================
   CYBER TOOLKIT — app.js
   ========================================== */

const API = "/api";
let activeControllers = {};  // abort controllers keyed by scan id

// ── Clock ──────────────────────────────────
(function clock() {
  const el = document.getElementById("clock");
  const tick = () => { el.textContent = new Date().toTimeString().slice(0, 8); };
  tick(); setInterval(tick, 1000);
})();

// ── Tab switching ──────────────────────────
const TITLES = { arp: "ARP Network Scan", sub: "Subdomain Enumeration", dir: "Directory Enumeration", down: "File Downloader" };

function switchTab(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("tab-" + id).classList.add("active");
  document.querySelector(`[data-tab="${id}"]`).classList.add("active");
  document.getElementById("page-title").textContent = TITLES[id] || id;
}

// ── Spinner ────────────────────────────────
function showSpinner(t) { document.getElementById("spin-txt").textContent = t || "Processing..."; document.getElementById("spinner").classList.remove("hidden"); }
function hideSpinner()  { document.getElementById("spinner").classList.add("hidden"); }

// ── Messages ───────────────────────────────
function setMsg(id, type, html) {
  const el = document.getElementById(id + "-msg");
  const icon = type === "ok" ? "✓" : type === "err" ? "✗" : "◌";
  el.className = "msg " + type;
  el.innerHTML = `<span>${icon}</span> ${html}`;
}
function clearMsg(id) {
  const el = document.getElementById(id + "-msg");
  el.className = "msg hidden"; el.innerHTML = "";
}

// ── Table renderer ─────────────────────────
function buildTable(cols, rows) {
  if (!rows.length) return `<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg><p>No results found</p></div>`;
  const th = cols.map(c => `<th>${c.label}</th>`).join("");
  const tb = rows.map(r => "<tr>" + cols.map(c => {
    const v = r[c.key] ?? "—";
    return c.badge ? `<td><span class="badge b${v}">${v}</span></td>` : `<td>${v}</td>`;
  }).join("") + "</tr>").join("");
  return `<div class="results-header"><div class="results-count">Found <strong>${rows.length}</strong> result${rows.length !== 1 ? "s" : ""}</div></div><div class="tbl-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
}

function appendRow(tbodyEl, cols, row) {
  const tr = document.createElement("tr");
  cols.forEach(c => {
    const td = document.createElement("td");
    const v = row[c.key] ?? "—";
    td.innerHTML = c.badge ? `<span class="badge b${v}">${v}</span>` : v;
    tr.appendChild(td);
  });
  tbodyEl.appendChild(tr);
}

// ── Streaming helper ───────────────────────
async function streamScan(scanId, url, body, cols, outId, progId, fillId, progTxtId, stopBtnId, doneKey) {
  // abort any previous run
  if (activeControllers[scanId]) activeControllers[scanId].abort();
  const ctrl = new AbortController();
  activeControllers[scanId] = ctrl;

  // show progress
  document.getElementById(progId).classList.remove("hidden");
  document.getElementById(stopBtnId).style.display = "inline-flex";
  document.getElementById(fillId).style.width = "0%";
  document.getElementById(progTxtId).textContent = "Starting...";

  // build table shell
  const outEl = document.getElementById(outId);
  const colHeaders = cols.map(c => `<th>${c.label}</th>`).join("");
  outEl.innerHTML = `<div class="results-header"><div class="results-count" id="${outId}-count">Found <strong>0</strong> results</div></div><div class="tbl-wrap"><table><thead><tr>${colHeaders}</tr></thead><tbody id="${outId}-tbody"></tbody></table></div>`;
  const tbody = document.getElementById(outId + "-tbody");
  const countEl = document.getElementById(outId + "-count");

  let found = 0;

  try {
    const res = await fetch(API + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === "hit") {
            found++;
            appendRow(tbody, cols, msg.data);
            countEl.innerHTML = `Found <strong>${found}</strong> result${found !== 1 ? "s" : ""}`;
          }
          if (msg.type === "progress" || msg.type === "hit") {
            const pct = msg.total ? Math.round((msg.progress / msg.total) * 100) : 0;
            document.getElementById(fillId).style.width = pct + "%";
            document.getElementById(progTxtId).textContent = `${msg.progress} / ${msg.total}`;
          }
          if (msg.type === "done") {
            document.getElementById(fillId).style.width = "100%";
            document.getElementById(progTxtId).textContent = `Done — ${msg.count} found`;
            setMsg(scanId, "ok", `Scan complete — <strong>${msg.count}</strong> result${msg.count !== 1 ? "s" : ""} found.`);
            if (!msg.count) outEl.innerHTML = `<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg><p>No results found</p></div>`;
          }
        } catch { /* ignore malformed lines */ }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      setMsg(scanId, "inf", `Scan stopped. <strong>${found}</strong> result${found !== 1 ? "s" : ""} collected so far.`);
    } else {
      setMsg(scanId, "err", "Request failed: " + err.message);
    }
  } finally {
    document.getElementById(stopBtnId).style.display = "none";
    delete activeControllers[scanId];
  }
}

function stopScan(id) {
  if (activeControllers[id]) activeControllers[id].abort();
}

// ──────────────────────────────────────────
// ARP SCAN
// ──────────────────────────────────────────
async function loadInterfaces() {
  const sel = document.getElementById("iface");
  const hint = document.getElementById("iface-hint");
  try {
    const data = await fetch(API + "/interfaces").then(r => r.json());
    const list = data.interfaces || [];
    if (!list.length) { sel.innerHTML = `<option value="">No interfaces found</option>`; hint.textContent = "No interfaces detected"; return; }
    sel.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join("");
    hint.textContent = `${list.length} interface${list.length !== 1 ? "s" : ""} found`;
  } catch {
    sel.innerHTML = `<option value="">Failed to load</option>`;
    hint.textContent = "Could not reach /api/interfaces";
  }
}

async function arpScan() {
  const iface = document.getElementById("iface").value.trim();
  const range = document.getElementById("arp-range").value.trim();
  if (!iface || !range) { setMsg("arp", "err", "Both interface and IP range are required."); return; }

  clearMsg("arp");
  document.getElementById("arp-out").innerHTML = "";
  showSpinner("Running ARP scan...");

  try {
    const res = await fetch(API + "/arp-scan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interface: iface, ip_range: range })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Scan failed");
    setMsg("arp", "ok", `Scan complete — <strong>${data.count}</strong> device${data.count !== 1 ? "s" : ""} found.`);
    document.getElementById("arp-out").innerHTML = buildTable(
      [{ key: "ip", label: "IP ADDRESS" }, { key: "mac", label: "MAC ADDRESS" }],
      data.devices
    );
  } catch (err) {
    setMsg("arp", "err", err.message);
  } finally {
    hideSpinner();
  }
}

// ──────────────────────────────────────────
// SUBDOMAIN SCAN (streaming)
// ──────────────────────────────────────────
function subScan() {
  const domain = document.getElementById("sub-domain").value.trim();
  if (!domain) { setMsg("sub", "err", "Enter a target domain."); return; }
  clearMsg("sub");
  setMsg("sub", "inf", `Enumerating subdomains for <strong>${domain}</strong> — results appear in real-time...`);

  streamScan(
    "sub", "/subdomain-scan", { domain },
    [{ key: "subdomain", label: "SUBDOMAIN URL" }, { key: "status", label: "STATUS", badge: true }],
    "sub-out", "sub-prog", "sub-fill", "sub-prog-txt", "sub-stop"
  );
}

// ──────────────────────────────────────────
// DIR ENUM (streaming)
// ──────────────────────────────────────────
function dirScan() {
  const target = document.getElementById("dir-target").value.trim();
  if (!target) { setMsg("dir", "err", "Enter a target URL."); return; }
  clearMsg("dir");
  setMsg("dir", "inf", `Scanning directories on <strong>${target}</strong> — results appear in real-time...`);

  streamScan(
    "dir", "/dir-scan", { target },
    [{ key: "url", label: "PATH" }, { key: "label", label: "RESULT" }, { key: "status", label: "STATUS", badge: true }],
    "dir-out", "dir-prog", "dir-fill", "dir-prog-txt", "dir-stop"
  );
}

// ──────────────────────────────────────────
// DOWNLOADER
// ──────────────────────────────────────────
async function downloadFile() {
  const url  = document.getElementById("dl-url").value.trim();
  const name = document.getElementById("dl-name").value.trim();
  if (!url || !name) { setMsg("dl", "err", "Both URL and filename are required."); return; }

  clearMsg("dl");
  document.getElementById("dl-out").innerHTML = "";
  showSpinner("Downloading file...");

  try {
    const res = await fetch(API + "/download", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, filename: name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Download failed");

    const kb = (data.size_bytes / 1024).toFixed(1);
    setMsg("dl", "ok", "File downloaded successfully.");
    document.getElementById("dl-out").innerHTML = `
      <div class="dl-card">
        <div class="dl-label">FILENAME</div>
        <div class="dl-val">${data.file}</div>
        <div class="dl-meta">
          SIZE: <span>${kb} KB</span> &nbsp;|&nbsp; SAVED TO: <span>${data.path}</span>
        </div>
      </div>`;
  } catch (err) {
    setMsg("dl", "err", "Download failed: " + err.message);
  } finally {
    hideSpinner();
  }
}

// ── Init ───────────────────────────────────
switchTab("arp");
loadInterfaces();
