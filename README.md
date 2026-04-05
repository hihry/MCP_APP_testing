# apidash-agent-mcp

**GSoC 2026 POC — Agentic API Testing for API Dash**  
A working MCP server demonstrating the core pipeline: LLM test generation → interactive approval → execution → schema drift detection → visual patch review.
---

Visual Demonstration : https://www.youtube.com/watch?v=yynRa-KTfcY 
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

## Quick Start (AgentCore + Cognito JWT)

Use this minimal PowerShell flow for a clean end-to-end setup.

1. Create Cognito pool and unique domain:

```powershell
$REGION = "us-east-1"
$POOL_ID = aws cognito-idp create-user-pool --pool-name "salesmcpapps-pool" --region $REGION --query "UserPool.Id" --output text
$DOMAIN = "salesmcpapps-auth-395590"
aws cognito-idp create-user-pool-domain --user-pool-id $POOL_ID --domain $DOMAIN --region $REGION
```

2. Create resource scope and app client:

```powershell
$IDENTIFIER = "salesmcpapps-auth"
aws cognito-idp create-resource-server --user-pool-id $POOL_ID --identifier $IDENTIFIER --name "Sales MCP Apps" --scopes ScopeName=invoke,ScopeDescription="Invoke MCP server" --region $REGION
$CLIENT_OUTPUT = aws cognito-idp create-user-pool-client --user-pool-id $POOL_ID --client-name "salesmcpapps-client" --generate-secret --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH --allowed-o-auth-flows client_credentials --allowed-o-auth-scopes "salesmcpapps-auth/invoke" --allowed-o-auth-flows-user-pool-client --supported-identity-providers COGNITO --region $REGION
$clientObj = $CLIENT_OUTPUT | ConvertFrom-Json
$CLIENT_ID = $clientObj.UserPoolClient.ClientId
$CLIENT_SECRET = $clientObj.UserPoolClient.ClientSecret
```

3. Deploy AgentCore runtime:

```powershell
Push-Location ".\\apidashMCPagent"
try {
  agentcore deploy --target default --yes
} finally {
  Pop-Location
}
```

4. Get access token:

```powershell
$resp = Invoke-RestMethod -Method Post -Uri "https://$DOMAIN.auth.$REGION.amazoncognito.com/oauth2/token" -ContentType "application/x-www-form-urlencoded" -Body "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=salesmcpapps-auth/invoke"
$TOKEN = $resp.access_token
```

5. Call initialize on deployed runtime:

```powershell
$state = Get-Content ".\\apidashMCPagent\\agentcore\\.cli\\deployed-state.json" -Raw | ConvertFrom-Json
$runtimeObj = $state.targets.default.resources.runtimes.PSObject.Properties | Select-Object -First 1 -ExpandProperty Value
$ENCODED_ARN = [uri]::EscapeDataString($runtimeObj.runtimeArn)
$url = "https://bedrock-agentcore.$REGION.amazonaws.com/runtimes/$ENCODED_ARN/invocations"
$headers = @{"Content-Type"="application/json";"Accept"="application/json, text/event-stream";"Authorization"="Bearer $TOKEN";"User-Agent"="test-client/1.0"}
$body = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body
```

Notes:
- For VS Code `.vscode/mcp.json`, use the same runtime ARN but double-encoded in the URL.
- If domain creation fails, pick a different unique suffix.

## Docker Build (amd64 and arm64)

Use these commands from the workspace root so Docker gets the correct build context.

Build for local testing on amd64:

```bash
docker build --platform linux/amd64 -t sales-mcp-apps -f ./Dockerfile .
```

Prepare buildx once (required for cross-arch builds):

```bash
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

Build and push a multi-arch image (amd64 + arm64):

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-registry>/sales-mcp-apps:latest \
  -f ./Dockerfile \
  --push \
  .
```

Notes:
- `--push` is required for true multi-arch manifests.
- If you only need a local image, build a single platform (`linux/amd64` or `linux/arm64`) with `docker build`.

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

## AgentCore Deploy with Cognito JWT (Windows PowerShell)

This section captures the full production-style deployment flow for this repo using:

- AgentCore runtime deployment
- Cognito client credentials flow
- Custom JWT authorizer in `agentcore.json`
- VS Code MCP HTTP connection

### 1) Project Layout for AgentCore

AgentCore project root in this workspace:

- `apidashMCPagent/`

Runtime application code is intentionally isolated under:

- `apidashMCPagent/app/`

This avoids CDK recursive asset copy and path-length issues during synth/deploy.

### 2) Create Cognito User Pool and Domain

Set region:

```powershell
$REGION = "us-east-1"
```

Create user pool:

```powershell
$POOL_ID = aws cognito-idp create-user-pool `
  --pool-name "salesmcpapps-pool" `
  --region $REGION `
  --query "UserPool.Id" --output text

Write-Host "Pool ID: $POOL_ID"
```

Create domain (must be globally unique):

```powershell
$DOMAIN = "salesmcpapps-auth-395590"
aws cognito-idp create-user-pool-domain `
  --user-pool-id $POOL_ID `
  --domain $DOMAIN `
  --region $REGION
```

If you get "Domain already exists", reuse that domain if it is yours, or choose a new suffix.

### 3) Create Resource Server Scope and App Client

Create or update resource server scope:

```powershell
$IDENTIFIER = "salesmcpapps-auth"

$createRs = aws cognito-idp create-resource-server `
  --user-pool-id $POOL_ID `
  --identifier $IDENTIFIER `
  --name "Sales MCP Apps" `
  --scopes ScopeName=invoke,ScopeDescription="Invoke MCP server" `
  --region $REGION 2>&1

if ($LASTEXITCODE -ne 0 -and ($createRs -match "ResourceServerAlreadyExistsException")) {
  aws cognito-idp update-resource-server `
    --user-pool-id $POOL_ID `
    --identifier $IDENTIFIER `
    --name "Sales MCP Apps" `
    --scopes ScopeName=invoke,ScopeDescription="Invoke MCP server" `
    --region $REGION | Out-Null
}
```

Create app client:

```powershell
$CLIENT_OUTPUT = aws cognito-idp create-user-pool-client `
  --user-pool-id $POOL_ID `
  --client-name "salesmcpapps-client" `
  --generate-secret `
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH `
  --allowed-o-auth-flows client_credentials `
  --allowed-o-auth-scopes "salesmcpapps-auth/invoke" `
  --allowed-o-auth-flows-user-pool-client `
  --supported-identity-providers COGNITO `
  --region $REGION

$clientObj = $CLIENT_OUTPUT | ConvertFrom-Json
$CLIENT_ID = $clientObj.UserPoolClient.ClientId
$CLIENT_SECRET = $clientObj.UserPoolClient.ClientSecret

Write-Host "Client ID: $CLIENT_ID"
Write-Host "Client Secret: $CLIENT_SECRET"
Write-Host "Discovery URL: https://cognito-idp.$REGION.amazonaws.com/$POOL_ID/.well-known/openid-configuration"
```

### 4) Configure JWT Authorizer in AgentCore Runtime

In `apidashMCPagent/agentcore/agentcore.json`, runtime config must include:

- `authorizerType: CUSTOM_JWT`
- `authorizerConfiguration.customJwtAuthorizer.discoveryUrl`
- `authorizerConfiguration.customJwtAuthorizer.allowedClients`
- `authorizerConfiguration.customJwtAuthorizer.allowedScopes`

Current expected scope:

- `salesmcpapps-auth/invoke`

### 5) Deploy Runtime

Run deploy from the AgentCore project directory:

```powershell
Push-Location ".\apidashMCPagent"
try {
  agentcore deploy --target default --yes
} finally {
  Pop-Location
}
```

### 6) Fetch OAuth Access Token

```powershell
$resp = Invoke-RestMethod -Method Post `
  -Uri "https://$DOMAIN.auth.$REGION.amazoncognito.com/oauth2/token" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=salesmcpapps-auth/invoke"

$TOKEN = $resp.access_token
Write-Host "TOKEN=$TOKEN"
```

### 7) Test MCP Initialize via Invoke API

Read runtime ARN from deployed state:

```powershell
$state = Get-Content ".\apidashMCPagent\agentcore\.cli\deployed-state.json" -Raw | ConvertFrom-Json
$runtimeObj = $state.targets.default.resources.runtimes.PSObject.Properties | Select-Object -First 1 -ExpandProperty Value
$RUNTIME_ARN = $runtimeObj.runtimeArn
```

Use single-encoded ARN for direct API calls:

```powershell
$ENCODED_ARN = [uri]::EscapeDataString($RUNTIME_ARN)
$url = "https://bedrock-agentcore.$REGION.amazonaws.com/runtimes/$ENCODED_ARN/invocations"

$headers = @{
  "Content-Type" = "application/json"
  "Accept" = "application/json, text/event-stream"
  "Authorization" = "Bearer $TOKEN"
  "User-Agent" = "test-client/1.0"
}

$body = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body
```

### 8) Connect from VS Code (.vscode/mcp.json)

Use HTTP MCP server config:

```json
{
  "servers": {
    "apidash-mcp-apps": {
      "type": "http",
      "url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%253Aaws%253Abedrock-agentcore%253Aus-east-1%253A<aws_account_id>%253Aruntime%252F<runtime_id>/invocations",
      "headers": {
        "Authorization": "Bearer ${env:AGENTCORE_BEARER_TOKEN}",
        "User-Agent": "vscode-mcp-client/1.0"
      }
    }
  }
}
```

Important: in `mcp.json`, the runtime ARN in the URL must be double-encoded.

### 9) Troubleshooting Notes

- If you see `exec /bin/sh: exec format error` in Docker build, remove hardcoded arm64 from Dockerfile and build for your local platform.
- If `docker run -p 8000:8000 ...` fails with `port is already allocated`, move to another host port (for example `-p 8001:8000`) or stop the conflicting container.
- If Cognito domain create fails with "already associated" or "already exists", choose a unique domain prefix.
- If initialize returns runtime 403 with valid token, inspect CloudWatch logs for runtime-specific authorization details.

### 10) Cleanup

Delete AgentCore stack:

```powershell
aws cloudformation delete-stack `
  --stack-name AgentCore-apidashMCPagent-default `
  --region $REGION
```

Delete Cognito domain and user pool:

```powershell
aws cognito-idp delete-user-pool-domain `
  --user-pool-id $POOL_ID `
  --domain $DOMAIN `
  --region $REGION

aws cognito-idp delete-user-pool `
  --user-pool-id $POOL_ID `
  --region $REGION
```

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

![Test Review and Approval screen showing generated tests awaiting user confirmation](docs/images/test-review-approval.png)

*The execution only begins after manual approval: review the selected tests, then click **Confirm & Begin Execution**.*

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
