#!/usr/bin/env node
/**
 * PostToolUse hook: runs eslint and tsc after every file write.
 * Triggers on Write | Edit | MultiEdit. Outputs errors to stdout for AI to fix immediately.
 *
 * Skips non-TS/JS files. Uses CURSOR_WORKSPACE_ROOT or process.cwd() for project root.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.env.CURSOR_WORKSPACE_ROOT || process.cwd();
const TS_JS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function getTargetPaths(input) {
  const paths = [];
  if (!input || typeof input !== 'object') return [];
  if (typeof input.path === 'string') paths.push(input.path);
  if (Array.isArray(input.paths)) paths.push(...input.paths);
  if (typeof input.file_path === 'string') paths.push(input.file_path);
  if (Array.isArray(input.filePaths)) paths.push(...input.filePaths);
  if (typeof input.path_in_repository === 'string') paths.push(input.path_in_repository);
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      if (e?.path) paths.push(e.path);
      if (e?.file_path) paths.push(e.file_path);
    }
  }
  return [...new Set(paths)].filter(Boolean);
}

function resolvePath(p) {
  if (path.isAbsolute(p)) return p;
  return path.join(ROOT, p);
}

function findEslintConfig() {
  const names = ['.eslintrc.cjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc', 'eslint.config.js', 'eslint.config.mjs'];
  for (const n of names) {
    const fp = path.join(ROOT, n);
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

function main() {
  let stdinData = '';
  try {
    stdinData = fs.readFileSync(0, 'utf8');
  } catch {
    process.exit(0);
  }

  let data = {};
  try {
    data = JSON.parse(stdinData);
  } catch {
    process.exit(0);
  }

  const toolName = data.tool_name ?? data.toolName ?? '';
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) process.exit(0);

  const toolInput = data.tool_input ?? data.toolInput ?? data.input ?? {};
  const rawPaths = getTargetPaths(toolInput);
  const absPaths = rawPaths.map(resolvePath).filter((p) => TS_JS.test(p));

  if (absPaths.length === 0) process.exit(0);

  let hasError = false;
  const errors = [];

  // ESLint per-file
  const eslintConfig = findEslintConfig();
  if (eslintConfig) {
    const configArg = `-c "${eslintConfig}"`;
    for (const fp of absPaths) {
      if (!fs.existsSync(fp)) continue;
      try {
        execSync(`npx eslint ${configArg} "${fp}"`, {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['inherit', 'pipe', 'pipe'],
        });
      } catch (e) {
        hasError = true;
        errors.push(e.stderr || e.stdout || e.message);
      }
    }
  }

  // tsc --noEmit (project-wide)
  const tsconfig = path.join(ROOT, 'tsconfig.json');
  if (fs.existsSync(tsconfig)) {
    try {
      execSync('npx tsc --noEmit', { cwd: ROOT, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
    } catch (e) {
      hasError = true;
      errors.push(e.stderr || e.stdout || e.message);
    }
  }

  if (hasError && errors.length > 0) {
    console.error('\n--- Typecheck / Lint errors (fix before continuing) ---\n');
    console.error(errors.join('\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
