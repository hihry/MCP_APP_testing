import type { HealingPatch } from "../types.js";

const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  cosmetic:      { bg: "#6c708620", text: "#6c7086", label: "COSMETIC" },
  compatible:    { bg: "#a6e3a120", text: "#a6e3a1", label: "COMPATIBLE" },
  breaking:      { bg: "#f38ba820", text: "#f38ba8", label: "BREAKING" },
  architectural: { bg: "#cba6f720", text: "#cba6f7", label: "ARCHITECTURAL" },
};

export function buildHealingDiffHTML(patch: HealingPatch, sessionId: string): string {
  const sev = SEVERITY_COLORS[patch.severity] ?? SEVERITY_COLORS.breaking;
  const confidencePct = Math.round(patch.confidence * 100);

  const originalJson = JSON.stringify(patch.originalAssertion, null, 2);
  const proposedJson = JSON.stringify(patch.proposedAssertion, null, 2);

  // Compute line-level diff for highlighting
  const originalLines = originalJson.split("\n");
  const proposedLines = proposedJson.split("\n");

  function diffLines(lines: string[], otherLines: string[]): string {
    return lines
      .map((line) => {
        const inOther = otherLines.includes(line);
        if (!inOther) {
          return `<div class="diff-line removed">- ${escapeHtml(line)}</div>`;
        }
        return `<div class="diff-line">&nbsp; ${escapeHtml(line)}</div>`;
      })
      .join("\n");
  }

  function addedLines(lines: string[], otherLines: string[]): string {
    return lines
      .map((line) => {
        const inOther = otherLines.includes(line);
        if (!inOther) {
          return `<div class="diff-line added">+ ${escapeHtml(line)}</div>`;
        }
        return `<div class="diff-line">&nbsp; ${escapeHtml(line)}</div>`;
      })
      .join("\n");
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Healing Diff — API Dash Agent</title>
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
    --danger: #f38ba8;
    --border: #45475a;
    --removed-bg: #f38ba812;
    --added-bg: #a6e3a112;
    --radius: 8px;
    --font: 'Segoe UI', system-ui, sans-serif;
    --mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg-primary); color: var(--text-primary); padding: 16px; font-size: 13px; }

  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
  .header-left h2 { font-size: 15px; font-weight: 600; color: var(--danger); }
  .header-left p { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
  .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

  .severity-badge {
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
    background: ${sev.bg}; color: ${sev.text};
    border: 1px solid ${sev.text}40;
  }
  .confidence {
    font-size: 11px; color: var(--text-muted);
  }
  .confidence span { color: ${confidencePct >= 80 ? "#a6e3a1" : "#f9e2af"}; font-weight: 600; }

  .meta-row {
    display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
  }
  .meta-chip {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 6px; padding: 4px 10px; font-size: 12px;
  }
  .meta-chip strong { color: var(--accent); }

  .diff-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;
  }
  .diff-panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .diff-panel-header {
    background: var(--bg-card); padding: 6px 12px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border);
  }
  .diff-panel-header.before { color: var(--danger); }
  .diff-panel-header.after  { color: var(--success); }
  .diff-body { padding: 12px; font-family: var(--mono); font-size: 12px; line-height: 1.6; }
  .diff-line { white-space: pre-wrap; border-radius: 3px; padding: 1px 4px; }
  .diff-line.removed { background: var(--removed-bg); color: var(--danger); }
  .diff-line.added   { background: var(--added-bg);   color: var(--success); }

  .reasoning-box {
    background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
    margin-bottom: 14px; overflow: hidden;
  }
  .reasoning-header {
    background: var(--bg-card); padding: 6px 12px; font-size: 11px; font-weight: 600;
    color: var(--text-muted); cursor: pointer; display: flex; justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }
  .reasoning-body { padding: 12px; color: var(--text-secondary); font-size: 12px; line-height: 1.6; }

  .action-bar {
    display: flex; gap: 10px; align-items: center;
    background: var(--bg-secondary); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 12px 16px;
  }
  .btn {
    padding: 7px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;
    border: none; transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.85; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-approve { background: var(--success); color: var(--bg-primary); }
  .btn-reject  { background: var(--bg-card); color: var(--danger); border: 1px solid var(--danger); }
  .btn-copy    { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border); font-size: 12px; }
  .action-note { color: var(--text-muted); font-size: 11px; margin-left: auto; }

  .status-bar {
    margin-top: 12px; padding: 8px 12px; border-radius: 6px; font-size: 12px; display: none;
  }
  .status-bar.success { background: #a6e3a120; border: 1px solid #a6e3a140; color: var(--success); display: block; }
  .status-bar.error   { background: #f38ba820; border: 1px solid #f38ba840; color: var(--danger);  display: block; }

  @media (max-width: 600px) { .diff-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h2>🔧 Self-Healing Patch Review</h2>
    <p>API Dash Agent — Session <code>${sessionId}</code></p>
  </div>
  <div class="header-right">
    <div class="severity-badge">${sev.label} DRIFT</div>
    <div class="confidence">Confidence: <span>${confidencePct}%</span></div>
  </div>
</div>

<div class="meta-row">
  <div class="meta-chip">Test: <strong>${patch.testId}</strong></div>
  <div class="meta-chip">Field: <strong>${patch.field}</strong></div>
  <div class="meta-chip">Change: <strong>${patch.originalAssertion.expected}</strong> → <strong>${patch.proposedAssertion.expected}</strong></div>
</div>

<div class="diff-grid">
  <div class="diff-panel">
    <div class="diff-panel-header before">⬛ Before (Original Assertion)</div>
    <div class="diff-body">
      ${diffLines(originalLines, proposedLines)}
    </div>
  </div>
  <div class="diff-panel">
    <div class="diff-panel-header after">✅ After (Proposed Patch)</div>
    <div class="diff-body">
      ${addedLines(proposedLines, originalLines)}
    </div>
  </div>
</div>

<div class="reasoning-box">
  <div class="reasoning-header" onclick="toggleReasoning()">
    💡 Why did this change? (LLM Analysis)
    <span id="reasoning-toggle">▼</span>
  </div>
  <div class="reasoning-body" id="reasoning-body">
    ${patch.reasoning}
  </div>
</div>

<div class="action-bar">
  <button class="btn btn-approve" onclick="sendDecision('approve')">✅ Approve Patch</button>
  <button class="btn btn-reject"  onclick="sendDecision('reject')">❌ Reject</button>
  <button class="btn btn-copy"    onclick="copyDiff()">📋 Copy Diff</button>
  <div class="action-note">Human review required — ${sev.label} severity</div>
</div>

<div class="status-bar" id="status-bar"></div>

<script>
  const SESSION_ID = "${sessionId}";
  const PATCH = ${JSON.stringify(patch)};

  // ── JSON-RPC Client ────────────────────────────────────────────────────────
  let _reqId = 0;
  const _pending = {};

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || !msg.id) return;
    const { resolve, reject } = _pending[msg.id] || {};
    if (!resolve) return;
    delete _pending[msg.id];
    if (msg.error) reject(msg.error); else resolve(msg.result);
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

  // ── Handshake ──────────────────────────────────────────────────────────────
  request('ui/initialize', { protocolVersion: '2025-11-21' }).then((res) => {
    if (res?.hostContext) {
      const root = document.documentElement;
      Object.entries(res.hostContext).forEach(([k, v]) => root.style.setProperty(k, v));
    }
    notify('ui/notifications/initialized');
    notifySize();
  }).catch(() => notifySize());

  // ── Actions ────────────────────────────────────────────────────────────────
  async function sendDecision(decision) {
    const btns = document.querySelectorAll('.btn');
    btns.forEach(b => b.disabled = true);

    const payload = {
      role: 'user',
      content: [{
        type: 'text',
        text: 'PATCH_DECISION: ' + decision + ' | testId: ' + PATCH.testId + ' | field: ' + PATCH.field + ' | sessionId: ' + SESSION_ID
      }]
    };

    try {
      await request('ui/message', payload);
      const msg = decision === 'approve'
        ? '✅ Patch approved — execution resuming with healed assertion'
        : '❌ Patch rejected — escalating for manual fix';
      showStatus(msg, decision === 'approve' ? 'success' : 'error');
    } catch (err) {
      showStatus('Decision sent (fallback mode): ' + decision, 'success');
    }
    notifySize();
  }

  async function copyDiff() {
    const diffText = [
      'HEALING DIFF — ' + PATCH.testId,
      'Field: ' + PATCH.field,
      'Severity: ' + PATCH.severity.toUpperCase(),
      '',
      'BEFORE:',
      JSON.stringify(PATCH.originalAssertion, null, 2),
      '',
      'AFTER:',
      JSON.stringify(PATCH.proposedAssertion, null, 2),
      '',
      'Confidence: ' + Math.round(PATCH.confidence * 100) + '%',
      'Reasoning: ' + PATCH.reasoning,
    ].join('\\n');

    try {
      await request('ui/clipboard-write', { text: diffText });
      showStatus('✅ Diff copied to clipboard', 'success');
    } catch {
      showStatus('Copy: ' + diffText.slice(0, 80) + '…', 'success');
    }
  }

  function toggleReasoning() {
    const body = document.getElementById('reasoning-body');
    const toggle = document.getElementById('reasoning-toggle');
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? 'block' : 'none';
    toggle.textContent = hidden ? '▼' : '▶';
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
