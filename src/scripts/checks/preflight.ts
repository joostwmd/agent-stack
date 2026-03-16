import fs from "node:fs";
import path from "node:path";

export interface PreflightResult {
  pass: boolean;
  message: string;
  branch?: string;
  artifacts?: { path: string; exists: boolean }[];
}

/** Default artifacts required for plan workflow (Step 1). */
export const PLAN_REQUIRED_ARTIFACTS = ["00-requirements.md", "02-test-spec.md"];

/** Default artifacts required for execute workflow (Step 1). */
export const EXECUTE_REQUIRED_ARTIFACTS = ["03-plan.md", "tickets"];

/**
 * Run preflight checks: branch + artifact existence.
 * Returns structured PASS/FAIL.
 *
 * @param feature - Feature slug (e.g. "avatar-upload")
 * @param requiredArtifacts - Paths relative to .cursor/tickets/<feature>/ (e.g. ["00-requirements.md", "02-test-spec.md"])
 * @param projectRoot - Project root (default: cwd, resolved upward for .cursor)
 */
export function runPreflight(
  feature: string,
  requiredArtifacts: string[],
  projectRoot?: string
): PreflightResult {
  const root = projectRoot ?? process.cwd();
  const ticketsDir = path.join(root, ".cursor", "tickets", feature);

  const branch = getCurrentBranch(root);
  if (branch === "main" || branch === "master") {
    return {
      pass: false,
      message: `Preflight FAIL: On branch "${branch}". Workflows require a feature branch. Create and checkout a feature branch (e.g. feature/${feature}) first.`,
      branch,
    };
  }

  const artifacts: { path: string; exists: boolean }[] = [];
  for (const rel of requiredArtifacts) {
    const fullPath = path.join(ticketsDir, rel);
    const exists = existsSync(fullPath);
    artifacts.push({ path: `.cursor/tickets/${feature}/${rel}`, exists });
  }

  const missing = artifacts.filter((a) => !a.exists);
  if (missing.length > 0) {
    return {
      pass: false,
      message: [
        `Preflight FAIL: Missing required artifacts for feature "${feature}":`,
        ...missing.map((a) => `  - ${a.path}`),
        "",
        "Fix: Run the discovery workflow first (requirements-agent, test-strategist-agent) or ensure plan/tickets exist.",
      ].join("\n"),
      branch,
      artifacts,
    };
  }

  return {
    pass: true,
    message: `Preflight PASS: Branch "${branch}", all artifacts present.`,
    branch,
    artifacts,
  };
}

function getCurrentBranch(root: string): string {
  try {
    const headPath = path.join(root, ".git", "HEAD");
    const content = fs.readFileSync(headPath, "utf-8").trim();
    const match = content.match(/ref: refs\/heads\/(.+)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

function existsSync(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
