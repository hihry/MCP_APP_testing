import type { ApiTestCase } from "../types.js";

const TYPE_COLORS: Record<string, string> = {
  happy_path:      "#22c55e",
  boundary_value:  "#f59e0b",
  error_injection: "#ef4444",
  security_probe:  "#8b5cf6",
};

const PRIORITY_ICONS: Record<string, string> = {
  high:   "🔴",
  medium: "🟡",
  low:    "🟢",
};

export function buildTestReviewHTML(tests: ApiTestCase[], sessionId: string): string {
  const rows = tests.map((tc) => `
    <tr id="row-${tc.id}" class="test-row ${tc.enabled ? "enabled" : "disabled"}">
      <td class="td-toggle">
        <label class="toggle-switch">
          <input 
            type="checkbox" 
            id="toggle-${tc.id}" 
            ${tc.enabled ? "checked" : ""}
            onchange="handleToggle('${tc.id}', this.checked)"
          />
          <span class="slider"></span>
        </label>
      </td>
      <td class="td-name">
        <span class="test-name">${tc.name}</span>
        <span class="test-desc">${tc.description}</span>
      </td>
      <td class="td-badge">
        <span class="badge" style="background:${TYPE_COLORS[tc.type] ?? "#6b7280"}20; color:${TYPE_COLORS[tc.type] ?? "#6b7280"}; border:1px solid ${TYPE_COLORS[tc.type] ?? "#6b7280"}40">
          ${tc.type.replace("_", " ")}
        </span>
      </td>
      <td class="td-priority">${PRIORITY_ICONS[tc.priority] ?? "⚪"} ${tc.priority}</td>
      <td class="td-endpoint">
        <code class="endpoint-tag">${tc.method} ${tc.path}</code>
      </td>
    </tr>
  `).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Test Review — API Dash Agent</title>
<style>
  :root {
    --bg-primary: #1e1e2e;
    --bg-secondary: #181825;
    --bg-card: #313244;
    --text-primary: #cdd6f4;
    --text-secondary: #a6adc8;
    --text-muted: #6c7086;
    --accent: #89b4fa;
    --success: #a6e3a1;
    --warning: #f9e2af;
    --danger: #f38ba8;
    --border: #45475a;
    --radius: 8px;
    --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font);
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 16px;
    font-size: 13px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .header-left h2 { font-size: 15px; font-weight: 600; color: var(--accent); }
  .header-left p { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
  .state-badge {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 11px;
    color: var(--warning);
    font-weight: 600;
  }
  .bulk-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    align-items: center;
  }
  .btn-sm {
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s;
  }
  .btn-sm:hover { background: var(--border); }
  .counter { color: var(--text-muted); font-size: 12px; margin-left: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-secondary);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
  }
  th {
    background: var(--bg-card);
    padding: 8px 12px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .test-row.disabled { opacity: 0.45; }
  .test-name { display: block; font-weight: 500; }
  .test-desc { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }
  .endpoint-tag {
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: var(--accent);
    white-space: nowrap;
  }
  .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--border);
    border-radius: 20px;
    transition: 0.2s;
  }
  .slider:before {
    content: "";
    position: absolute;
    height: 14px; width: 14px;
    left: 3px; bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
  }
  input:checked + .slider { background: var(--accent); }
  input:checked + .slider:before { transform: translateX(16px); }
  .confirm-bar {
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .confirm-summary { color: var(--text-secondary); font-size: 12px; }
  .confirm-summary strong { color: var(--text-primary); }
  .btn-confirm {
    background: var(--accent);
    color: var(--bg-primary);
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: opacity 0.15s;
  }
  .btn-confirm:hover { opacity: 0.9; }
  .btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
  .status-bar {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    display: none;
  }
  .status-bar.success { background: #a6e3a120; border: 1px solid #a6e3a140; color: var(--success); display: block; }
  .status-bar.error { background: #f38ba820; border: 1px solid #f38ba840; color: var(--danger); display: block; }
  .td-toggle { width: 56px; }
  .td-priority { width: 90px; white-space: nowrap; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h2>🧪 Test Review & Approval</h2>
    <p>API Dash Agent — Session <code>${sessionId}</code></p>
  </div>
  <div class="state-badge">⏳ AWAITING APPROVAL</div>
</div>

<div class="bulk-actions">
  <button class="btn-sm" onclick="selectAll()">Select All</button>
  <button class="btn-sm" onclick="selectNone()">Select None</button>
  <button class="btn-sm" onclick="selectByType('happy_path')">Happy Path Only</button>
  <button class="btn-sm" onclick="copyTests()">📋 Copy JSON</button>
  <span class="counter" id="counter">Loading…</span>
</div>

<table>
  <thead>
    <tr>
      <th>Run</th>
      <th>Test Name</th>
      <th>Type</th>
      <th>Priority</th>
      <th>Endpoint</th>
    </tr>
  </thead>
  <tbody id="test-table">
    ${rows}
  </tbody>
</table>

<div class="confirm-bar">
  <div class="confirm-summary">
    <strong id="approved-count">${tests.filter((t) => t.enabled).length}</strong> of 
    <strong>${tests.length}</strong> tests selected for execution
  </div>
  <button class="btn-confirm" id="confirm-btn" onclick="confirmSelection()">
    ✅ Confirm &amp; Begin Execution
  </button>
</div>

<div class="status-bar" id="status-bar"></div>

<script>
  // ── State ──────────────────────────────────────────────────────────────────
  const SESSION_ID = "${sessionId}";
  const ALL_TESTS = ${JSON.stringify(tests)};
  const toggleState = {};
  ALL_TESTS.forEach(t => { toggleState[t.id] = t.enabled; });

  // ── JSON-RPC Client (MCP Apps Protocol) ───────────────────────────────────
  let _reqId = 0;
  const _pending = {};

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || !msg.id) return;
    const { resolve, reject } = _pending[msg.id] || {};
    if (!resolve) return;
    delete _pending[msg.id];
    if (msg.error) reject(msg.error);
    else resolve(msg.result);
  });

  function request(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++_reqId;
      _pending[id] = { resolve, reject };
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
    });
  }

  function notify(method, params) {
    window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
  }

  // ── MCP Apps Handshake ────────────────────────────────────────────────────
  request('ui/initialize', { protocolVersion: '2025-11-21' }).then((res) => {
    applyHostContext(res?.hostContext);
    notify('ui/notifications/initialized');
    updateCounter();
    notifySize();
  }).catch(() => {
    // Graceful degradation: works standalone too
    updateCounter();
  });

  function applyHostContext(ctx) {
    if (!ctx) return;
    const root = document.documentElement;
    Object.entries(ctx).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  // ── UI Logic ──────────────────────────────────────────────────────────────
  function handleToggle(testId, checked) {
    toggleState[testId] = checked;
    const row = document.getElementById('row-' + testId);
    if (row) row.className = 'test-row ' + (checked ? 'enabled' : 'disabled');
    updateCounter();
  }

  function updateCounter() {
    const approved = Object.values(toggleState).filter(Boolean).length;
    document.getElementById('counter').textContent = approved + ' selected';
    document.getElementById('approved-count').textContent = approved;
    document.getElementById('confirm-btn').disabled = approved === 0;
  }

  function selectAll() {
    Object.keys(toggleState).forEach(id => {
      toggleState[id] = true;
      const el = document.getElementById('toggle-' + id);
      if (el) el.checked = true;
      const row = document.getElementById('row-' + id);
      if (row) row.className = 'test-row enabled';
    });
    updateCounter();
  }

  function selectNone() {
    Object.keys(toggleState).forEach(id => {
      toggleState[id] = false;
      const el = document.getElementById('toggle-' + id);
      if (el) el.checked = false;
      const row = document.getElementById('row-' + id);
      if (row) row.className = 'test-row disabled';
    });
    updateCounter();
  }

  function selectByType(type) {
    ALL_TESTS.forEach(t => {
      const checked = t.type === type;
      toggleState[t.id] = checked;
      const el = document.getElementById('toggle-' + t.id);
      if (el) el.checked = checked;
      const row = document.getElementById('row-' + t.id);
      if (row) row.className = 'test-row ' + (checked ? 'enabled' : 'disabled');
    });
    updateCounter();
  }

  async function copyTests() {
    const approved = ALL_TESTS.filter(t => toggleState[t.id]);
    const json = JSON.stringify(approved.map(t => t.id), null, 2);
    try {
      await request('ui/clipboard-write', { text: json });
      showStatus('✅ Approved test IDs copied to clipboard', 'success');
    } catch {
      showStatus('Clipboard: ' + json, 'success');
    }
  }

  async function confirmSelection() {
    const approvedIds = Object.entries(toggleState)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const skippedIds = Object.entries(toggleState)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    const btn = document.getElementById('confirm-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Sending…';

    try {
      await request('ui/update-model-context', {
        content: [{
          type: 'structuredContent',
          structuredContent: {
            approvedTests: approvedIds,
            skippedTests: skippedIds,
            sessionId: SESSION_ID,
            userDecisionTimestamp: new Date().toISOString()
          }
        }]
      });
      showStatus('✅ ' + approvedIds.length + ' tests approved — execution starting…', 'success');
      btn.textContent = '✅ Confirmed';
    } catch (err) {
      // Fallback: inject via ui/message
      await request('ui/message', {
        role: 'user',
        content: [{ type: 'text', text: 'AGENT_ACTION: execute_tests | approvedTests: ' + JSON.stringify(approvedIds) + ' | sessionId: ' + SESSION_ID }]
      }).catch(() => {});
      showStatus('✅ ' + approvedIds.length + ' tests confirmed via chat message', 'success');
      btn.textContent = '✅ Confirmed';
    }

    notifySize();
  }

  function showStatus(msg, type) {
    const bar = document.getElementById('status-bar');
    bar.textContent = msg;
    bar.className = 'status-bar ' + type;
    notifySize();
  }

  function notifySize() {
    const w = document.documentElement.scrollWidth;
    const h = document.documentElement.scrollHeight;
    notify('ui/notifications/size-changed', { width: w, height: h });
  }

  new ResizeObserver(notifySize).observe(document.body);
</script>
</body>
</html>`;
}
