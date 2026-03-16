import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const SESSIONS_DIR = path.join(os.homedir(), ".cursor", "agent-stack-sessions");

function getProjectSlug(cwd: string): string {
  const base = path.basename(cwd);
  return base.replace(/[^a-zA-Z0-9_-]/g, "-") || "default";
}

export interface SessionStatus {
  projectSlug: string;
  isMultiSession: boolean;
  recentSessionCount: number;
  updatedAt: string;
}

export function getSessionStatus(projectRoot?: string): SessionStatus | null {
  try {
    const cwd = projectRoot ?? process.cwd();
    const slug = getProjectSlug(cwd);
    const statusPath = path.join(SESSIONS_DIR, `status-${slug}.json`);
    if (!fs.existsSync(statusPath)) return null;
    const content = fs.readFileSync(statusPath, "utf-8");
    return JSON.parse(content) as SessionStatus;
  } catch {
    return null;
  }
}

export function isMultiSession(projectRoot?: string): boolean {
  const status = getSessionStatus(projectRoot);
  return status?.isMultiSession ?? false;
}
