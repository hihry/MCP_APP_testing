# apidash-agent-mcp

**GSoC 2026 POC — Agentic API Testing for API Dash**  
A working MCP server demonstrating the core pipeline: LLM test generation → interactive approval → execution → schema drift detection → visual patch review.

---

---

## Key Design Decisions Demonstrated

**Optimisation 9.1 — Prompt caching structure:** The spec context is the system prompt (stable prefix), the per-endpoint task is the user message (volatile). Cache-eligible on Anthropic Claude.

**Optimisation 9.2 — Model routing:** All calls use Haiku in the POC; in the full system, security probes and BREAKING drift patches route to a larger model.

**Optimisation 9.3 — Deterministic validation:** Every LLM output has its `id` rewritten to a canonical form and `enabled` normalised before entering the executor.

**Section 8.3.1 — test-review MCP App:** Full MCP Apps protocol — `ui/initialize` handshake, `hostContext` theme injection, `ui/update-model-context` for structured approval payload, `ui/clipboard-write` for copy, `ui/notifications/size-changed` for dynamic resize.

**Section 8.3.2 — healing-diff MCP App:** Full MCP Apps protocol — side-by-side line diff with syntax highlighting, `ui/message` for Approve/Reject decisions, collapsible LLM reasoning, `ui/clipboard-write` for diff export.

---

## What This Demonstrates

| Stage | Component | Technology |
|---|---|---|
| Spec ingestion | `parse_spec` tool | Hardcoded JSONPlaceholder spec |
| AI test generation | `generate_tests` tool | Anthropic Claude (Haiku) |
| Human approval gate | `test-review` MCP App | Interactive HTML toggle table |
| Live execution | `execute_tests` tool | Real HTTP calls to JSONPlaceholder |
| Drift detection | `detect_and_heal` tool | Deterministic type diff algorithm |
| Patch review | `healing-diff` MCP App | Side-by-side visual diff + approve/reject |

---

## Prerequisites

- Node.js 18+
- VS Code Insiders (supports MCP Apps rendering)
- An Anthropic API key

---

## Setup

```bash
git clone <repo>
cd apidash-agent-mcp
npm install
npm run build
```

Set your API key:
```bash
# macOS/Linux
export ANTHROPIC_API_KEY=sk-ant-...

# Windows PowerShell (current terminal session)
$env:ANTHROPIC_API_KEY="sk-ant-..."

# Windows PowerShell (persist for new terminals)
setx ANTHROPIC_API_KEY "sk-ant-..."
```

If you use `setx`, restart VS Code Insiders so it picks up the updated environment variable.

---

## Running in VS Code Insiders

Create `.vscode/mcp.json` in this repo root (`.vscode/mcp.json` is local-only and gitignored):

```json
{
  "servers": {
    "apidash-agent": {
      "type": "stdio",
      "command": "node",
      "args": ["<absolute-path-to-repo>/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

Windows example path: `C:/Users/your-user/path/to/apidash-agent-mcp/dist/index.js`.

Open VS Code Insiders Copilot Chat in Agent mode.

---

## Demo Flow (Run These Prompts in Order)

### Step 1 — Parse the spec
```
parse the API spec
```
*Shows: session created, 4 endpoints parsed, state → PLANNING*

### Step 2 — Generate tests
```
generate tests for the users endpoints
```
*Shows: LLM generates 6-8 test cases, then the **test-review MCP App** opens — an interactive toggle table where you can enable/disable individual tests and hit "Confirm & Begin Execution"*

### Step 3 — Execute (normal run)
```
execute the approved tests
```
*Shows: real HTTP calls to JSONPlaceholder, pass/fail per test, response times and assertion results*

### Step 4 — Execute with drift simulation
```
execute the tests with simulate_drift set to true
```
*Shows: GET /users/{id} fails because the simulated v2 response returns `id` as string `"usr_1"` instead of integer `1` — assertion `type_is: integer` breaks*

### Step 5 — Detect drift and generate healing patch
```
detect and heal the failures
```
*Shows: drift analysis, then the **healing-diff MCP App** opens — side-by-side diff of the original assertion vs the proposed patch, with confidence score, LLM reasoning about why the type changed, and Approve/Reject buttons*

### Step 6 — Approve the patch
*Click Approve in the healing-diff MCP App — sends `PATCH_DECISION: approve` back to the agent via `ui/message`*

---

## Architecture Notes (Full System vs POC)

| Full System | This POC |
|---|---|
| SpecParser ingests real OpenAPI YAML/JSON files | Hardcoded JSONPlaceholder spec |
| Parallel Dart isolates for execution | Sequential async/await |
| All 5 MCP Apps (test-review, healing-diff, execution-monitor, report-viewer, message injection) | 2 MCP Apps (test-review, healing-diff) |
| Flutter WebView as MCP host | VS Code Insiders as host |
| Episodic session memory | In-memory Map |
| Full model routing (small/medium/large) | All calls use Claude Haiku |
| Prompt caching across session | Single-session, no cache |

---

## File Structure

```
src/
  index.ts              ← MCP server — tools + resource registration
  types.ts              ← All pipeline TypeScript types
  constants.ts          ← JSONPlaceholder spec + drift simulation data
  session-store.ts      ← In-memory AgentCore session state
  services/
    llm-client.ts       ← Anthropic API — test generation + healing reasoning
    test-executor.ts    ← HTTP runner + assertion evaluator
    drift-detector.ts   ← Schema drift detection + patch generation
  ui/
    test-review.ts      ← test-review MCP App HTML (toggle table)
    healing-diff.ts     ← healing-diff MCP App HTML (side-by-side diff)
```

*Built for GSoC 2026 — Agentic API Testing for API Dash*  
*Himanshu Ravindra Iwanati — IIT Kharagpur*
