#!/usr/bin/env node
/**
 * Event Logger - Logs all Cursor hook events to a file for traceability.
 *
 * Port of karanb192/claude-code-hooks event-logger.py.
 * Registers on every hook event type. Never blocks — always exits 0.
 *
 * Output: ~/.cursor/hooks-logs/YYYY-MM-DD.jsonl
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
  } catch (e) {
    console.error(`[event-logger] Error: ${e.message}`);
  }
  process.exit(0);
}

main();
