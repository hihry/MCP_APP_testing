import type { AgentSession, AgentState } from "./types.js";

// ─── In-Memory Session Store ────────────────────────────────────────────────
// In the full system this is backed by AgentCore's persistent session manager.
// For the POC we use a simple Map — sufficient for a single demo session.

const sessions = new Map<string, AgentSession>();

export function createSession(): AgentSession {
  const id = `sess_${Date.now()}`;
  const session: AgentSession = {
    id,
    state: "IDLE",
    generatedTests: [],
    approvedTests: [],
    executionResults: [],
    healingPatches: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): AgentSession | undefined {
  return sessions.get(id);
}

export function updateSession(
  id: string,
  updates: Partial<AgentSession>
): AgentSession {
  const existing = sessions.get(id);
  if (!existing) throw new Error(`Session ${id} not found`);
  const updated: AgentSession = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(id, updated);
  return updated;
}

export function transitionState(id: string, newState: AgentState): AgentSession {
  return updateSession(id, { state: newState });
}

export function getOrCreateDefaultSession(): AgentSession {
  // For the POC, we maintain a single "default" session
  const existing = [...sessions.values()].find((s) => s.state !== "COMPLETE" && s.state !== "FAILED");
  return existing ?? createSession();
}
