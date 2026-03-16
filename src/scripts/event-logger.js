#!/usr/bin/env node
/**
 * Event Logger - Logs all Cursor hook events to a file for traceability.
 *
 * Port of karanb192/claude-code-hooks event-logger.py.
 * Registers on every hook event type. Never blocks — always exits 0.
 *
 * Output: ~/.cursor/hooks-logs/YYYY-MM-DD.jsonl
 *
 * Session awareness (SessionStart):
 *   - Writes ~/.cursor/agent-stack-sessions/<project-slug>-$PPID
 *   - Counts session files modified in last 120 minutes for same project
 *   - If count > 1: writes status-<project-slug>.json with isMultiSession
 *   - Workflow scripts read this to set AGENT_STACK_MULTI_SESSION
 *
 * Covers all 13 event types:
 * SessionStart, SessionEnd, UserPromptSubmit, PreToolUse, PostToolUse,
 * PostToolUseFailure, PermissionRequest, SubagentStart, SubagentStop,
 * Stop, PreCompact, Setup, Notification
 *
 * Inspect logs:
 *   cat ~/.cursor/hooks-logs/$(date +%Y-%m-%d).jsonl | jq
 *   cat ~/.cursor/hooks-logs/*.jsonl | jq 'select(.hook_event_name=="PreToolUse")'
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const SESSIONS_DIR = path.join(os.homedir(), '.cursor', 'agent-stack-sessions');
const SESSION_WINDOW_MS = 120 * 60 * 1000; // 120 minutes

const MAX_STR = 2000;
const MAX_LIST = 50;

function getLogFilePath() {
  const logDir = path.join(os.homedir(), '.cursor', 'hooks-logs');
  fs.mkdirSync(logDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logDir, `${date}.jsonl`);
}

function truncate(value, maxLen = MAX_STR) {
  if (typeof value === 'string' && value.length > maxLen) {
    return `${value.slice(0, maxLen)}... (${value.length} chars)`;
  }
  return value;
}

function getProjectSlug(cwd) {
  try {
    const base = path.basename(cwd || process.cwd());
    return base.replace(/[^a-zA-Z0-9_-]/g, '-') || 'default';
  } catch {
    return 'default';
  }
}

function updateSessionTracking(hookEventName, cwd) {
  if (hookEventName !== 'SessionStart') return;
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const slug = getProjectSlug(cwd);
    const sessionFile = path.join(SESSIONS_DIR, `${slug}-${process.ppid}`);
    fs.writeFileSync(sessionFile, JSON.stringify({ cwd, ts: new Date().toISOString() }));
    const now = Date.now();
    const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.startsWith(slug + '-') && f.endsWith('.json') === false);
    let recentCount = 0;
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(SESSIONS_DIR, f));
        if (now - stat.mtimeMs < SESSION_WINDOW_MS) recentCount++;
      } catch {
        /* ignore */
      }
    }
    const isMultiSession = recentCount > 1;
    const statusPath = path.join(SESSIONS_DIR, `status-${slug}.json`);
    fs.writeFileSync(
      statusPath,
      JSON.stringify({
        projectSlug: slug,
        isMultiSession,
        recentSessionCount: recentCount,
        updatedAt: new Date().toISOString(),
      })
    );
    if (isMultiSession) {
      const envPath = path.join(SESSIONS_DIR, `env-${slug}`);
      fs.writeFileSync(envPath, `AGENT_STACK_MULTI_SESSION=1\n`);
    }
  } catch (e) {
    console.error(`[event-logger] Session tracking error: ${e.message}`);
  }
}

function processValue(value) {
  if (value === null || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return truncate(value, MAX_STR);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_LIST).map(processValue);
    if (value.length > MAX_LIST) {
      items.push(`... +${value.length - MAX_LIST} more`);
    }
    return items;
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[String(k)] = processValue(v);
    }
    return out;
  }
  return String(value);
}

function main() {
  try {
    const stdinData = fs.readFileSync(0, 'utf8');
    let data = {};
    if (stdinData && stdinData.trim()) {
      try {
        data = JSON.parse(stdinData);
      } catch {
        data = { _raw: stdinData };
      }
    }

    const event = {
      ts: new Date().toISOString(),
      hook_event_name: data.hook_event_name ?? 'unknown',
      cwd: process.cwd(),
      data: processValue(data),
    };

    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, JSON.stringify(event) + '\n');

    updateSessionTracking(event.hook_event_name, event.cwd);
  } catch (e) {
    console.error(`[event-logger] Error: ${e.message}`);
  }
  process.exit(0);
}

main();
