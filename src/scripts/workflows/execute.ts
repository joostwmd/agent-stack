#!/usr/bin/env npx tsx
/**
 * Execute workflow — 8 steps per task: load → test-writer → red verify → impl → green verify → mutation → review → commit+advance.
 */

import fs from "node:fs";
import path from "node:path";
import { formatStep } from "../lib/format-step.js";
import { subagentDispatch } from "../lib/dispatch.js";
import {
  runPreflight,
  EXECUTE_REQUIRED_ARTIFACTS,
} from "../checks/preflight.js";

const STEPS = 8;

function parseArgs(): {
  step: number;
  feature: string;
  task: string;
  retry: boolean;
} {
  const args = process.argv.slice(2);
  let step = 1;
  let feature = "";
  let task = "";
  let retry = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--step" && args[i + 1]) {
      step = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--feature" && args[i + 1]) {
      feature = args[i + 1];
      i++;
    } else if (args[i] === "--task" && args[i + 1]) {
      task = args[i + 1];
      i++;
    } else if (args[i] === "--retry") {
      retry = true;
    }
  }
  return { step, feature, task, retry };
}

function getProjectRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, ".cursor"))) return cwd;
  const parent = path.dirname(cwd);
  if (parent !== cwd && fs.existsSync(path.join(parent, ".cursor")))
    return parent;
  return cwd;
}

function getAgentForTask(planContent: string, taskId: string): string {
  const re = new RegExp(
    `Task ID: ${taskId}\\s+Agent: (\\S+)`,
    "m"
  );
  const m = planContent.match(re);
  return m ? m[1] : "";
}

function getTaskIdsInOrder(planContent: string): string[] {
  const tableMatch = planContent.match(/\| Step \| Task ID \|[\s\S]*?\n([\s\S]*?)(?=\n## |$)/);
  if (!tableMatch) {
    return (planContent.match(/Task ID: (T\d+)/g) ?? []).map((s) =>
      s.replace("Task ID: ", "")
    );
  }
  const rows = tableMatch[1]
    .split("\n")
    .filter((r) => r.includes("|"));
  const ids: string[] = [];
  for (const row of rows) {
    const cells = row.split("|").map((c) => c.trim());
    if (cells.length >= 3) {
      const id = cells[2];
      if (/^T\d+$/.test(id)) ids.push(id);
    }
  }
  return ids;
}

function getNextTask(planContent: string, currentTaskId: string): string | null {
  const taskIds = getTaskIdsInOrder(planContent);
  const idx = taskIds.indexOf(currentTaskId);
  return idx >= 0 && idx < taskIds.length - 1 ? taskIds[idx + 1] : null;
}

function runStep(
  step: number,
  feature: string,
  task: string,
  retry: boolean
): string {
  const root = getProjectRoot();
  const ticketsDir = path.join(root, ".cursor", "tickets", feature);
  const planPath = path.join(ticketsDir, "03-plan.md");

  switch (step) {
    case 1: {
      const result = runPreflight(
        feature,
        EXECUTE_REQUIRED_ARTIFACTS,
        root
      );
      if (!result.pass) {
        return formatStep(
          result.message,
          "",
          { title: "Step 1: Load task — FAILED" }
        ).replace(
          "WORKFLOW COMPLETE",
          "STOP. Fix the issues above, then rerun from Step 1."
        );
      }
      if (!task) {
        const planContent = fs.readFileSync(planPath, "utf-8");
        const taskIds = getTaskIdsInOrder(planContent);
        const nextTaskId = taskIds[0];
        if (!nextTaskId) {
          return formatStep(
            "No tasks found in plan.",
            "",
            { title: "Step 1: Load task — FAILED" }
          );
        }
        const nextCmd = `npx tsx workflows/execute.ts --step 2 --feature ${feature} --task ${nextTaskId}`;
        return formatStep(
          `Preflight PASS. First task: ${nextTaskId}. Load ticket tickets/${nextTaskId}*.md.`,
          nextCmd,
          { title: "Step 1: Load task" }
        );
      }
      const ticketGlob = path.join(ticketsDir, "tickets", `${task}*.md`);
      const ticketFiles = fs.existsSync(path.join(ticketsDir, "tickets"))
        ? fs.readdirSync(path.join(ticketsDir, "tickets")).filter((f) => f.startsWith(task) && f.endsWith(".md"))
        : [];
      if (ticketFiles.length === 0) {
        return formatStep(
          `No ticket found for ${task}. Check tickets/ directory.`,
          "",
          { title: "Step 1: Load task — FAILED" }
        );
      }
      const nextCmd = `npx tsx workflows/execute.ts --step 2 --feature ${feature} --task ${task}`;
      return formatStep(
        `Task ${task} loaded. Ticket: tickets/${ticketFiles[0]}. Verify dependencies are committed.`,
        nextCmd,
        { title: "Step 1: Load task" }
      );
    }

    case 2: {
      const planContent = fs.readFileSync(planPath, "utf-8");
      const agent = getAgentForTask(planContent, task);
      if (!agent || !agent.includes("test-writer")) {
        const nextCmd = `npx tsx workflows/execute.ts --step 4 --feature ${feature} --task ${task}`;
        return formatStep(
          `Task ${task} is not a test-writer task. Skip to implementation.`,
          nextCmd,
          { title: "Step 2: Skip test-writer (non-test task)" }
        );
      }
      const dispatchPrompt = subagentDispatch(
        "generalPurpose",
        `npx tsx workflows/execute.ts --step 3 --feature ${feature} --task ${task}`,
        [
          `Load test-writer-agent. Read ticket tickets/${task}*.md and 02-test-spec.md.`,
          "Write tests that define the expected behavior. Tests should FAIL initially (TDD red phase).",
        ].join("\n\n")
      );
      return formatStep(
        dispatchPrompt,
        "",
        { title: "Step 2: Dispatch test-writer-agent" }
      ).replace(
        "WORKFLOW COMPLETE",
        `After tests are written, run:\n    npx tsx workflows/execute.ts --step 3 --feature ${feature} --task ${task}`
      );
    }

    case 3: {
      const body = [
        "Run the test suite. Confirm tests FAIL (RED phase).",
        "If tests pass, the test-writer may have implemented behavior — review and adjust.",
        "",
        `Command: pnpm test (or npm test / vitest / jest — project-specific)`,
        "",
        "After confirming RED:",
      ].join("\n");
      const nextCmd = `npx tsx workflows/execute.ts --step 4 --feature ${feature} --task ${task}`;
      return formatStep(body, nextCmd, {
        title: "Step 3: Verify RED",
      });
    }

    case 4: {
      const planContent = fs.readFileSync(planPath, "utf-8");
      const agent = getAgentForTask(planContent, task);
      const dispatchPrompt = subagentDispatch(
        "generalPurpose",
        `npx tsx workflows/execute.ts --step 5 --feature ${feature} --task ${task}`,
        [
          `Load ${agent || "implementation-agent"}. Read ticket tickets/${task}*.md.`,
          "Implement the task. Aim for GREEN (tests pass).",
        ].join("\n\n")
      );
      return formatStep(
        dispatchPrompt,
        "",
        { title: `Step 4: Dispatch implementation agent (${agent || "impl"})` }
      ).replace(
        "WORKFLOW COMPLETE",
        `After implementation, run:\n    npx tsx workflows/execute.ts --step 5 --feature ${feature} --task ${task}`
      );
    }

    case 5: {
      const body = [
        "Run the test suite. Confirm tests PASS (GREEN phase).",
        "",
        "If PASS: proceed to Step 6.",
        "If FAIL (max 3 retries): return to Step 4 with --retry.",
        "",
        `Retry count: ${retry ? "1+" : "0"}`,
      ].join("\n");
      const ifPass = `npx tsx workflows/execute.ts --step 6 --feature ${feature} --task ${task}`;
      const ifFail = `npx tsx workflows/execute.ts --step 4 --feature ${feature} --task ${task} --retry`;
      return formatStep(body, "", {
        title: "Step 5: Verify GREEN",
        ifPass,
        ifFail,
      }).replace(
        "NEXT STEP (MANDATORY",
        "NEXT STEP (MANDATORY — run tests first, then choose based on result"
      );
    }

    case 6: {
      const dispatchPrompt = subagentDispatch(
        "generalPurpose",
        `npx tsx workflows/execute.ts --step 7 --feature ${feature} --task ${task}`,
        [
          "Load mutation-tester-agent. Run Stryker (or equivalent) scoped to changed files.",
          "Kill survivors. Report mutation score.",
        ].join("\n\n")
      );
      return formatStep(
        dispatchPrompt,
        "",
        { title: "Step 6: Dispatch mutation-tester-agent" }
      ).replace(
        "WORKFLOW COMPLETE",
        `After mutation testing, run:\n    npx tsx workflows/execute.ts --step 7 --feature ${feature} --task ${task}`
      );
    }

    case 7: {
      const dispatchPrompt = subagentDispatch(
        "generalPurpose",
        `npx tsx workflows/execute.ts --step 8 --feature ${feature} --task ${task}`,
        [
          "Load reviewer-agent. Read src/review/checklist.md and the task ticket.",
          "Review the diff. Flag BLOCKING issues. If BLOCKING, return to Step 4.",
        ].join("\n\n")
      );
      return formatStep(
        dispatchPrompt,
        "",
        { title: "Step 7: Dispatch reviewer-agent" }
      ).replace(
        "WORKFLOW COMPLETE",
        `After review passes, run:\n    npx tsx workflows/execute.ts --step 8 --feature ${feature} --task ${task}`
      );
    }

    case 8: {
      const planContent = fs.readFileSync(planPath, "utf-8");
      const nextTaskId = getNextTask(planContent, task);
      if (nextTaskId) {
        const nextCmd = `npx tsx workflows/execute.ts --step 1 --feature ${feature} --task ${nextTaskId}`;
        return formatStep(
          `Commit changes with conventional commit from plan. Advance to next task: ${nextTaskId}.`,
          nextCmd,
          { title: "Step 8: Commit + advance" }
        );
      }
      return formatStep(
        "Commit changes. All tasks complete. WORKFLOW COMPLETE.",
        "",
        { title: "Step 8: Commit + COMPLETE" }
      );
    }

    default:
      return `Unknown step ${step}. Valid: 1–${STEPS}.`;
  }
}

function main() {
  const { step, feature, task, retry } = parseArgs();
  if (!feature) {
    console.error(
      "Usage: npx tsx workflows/execute.ts --step N --feature <feature-slug> [--task TNN] [--retry]"
    );
    process.exit(1);
  }
  console.log(runStep(step, feature, task, retry));
}

main();
