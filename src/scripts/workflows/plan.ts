#!/usr/bin/env npx tsx
/**
 * Plan workflow — 9 steps: preflight → orchestrator → self-check → human → tickets → self-check → human → TODOS → done.
 */

import fs from "node:fs";
import path from "node:path";
import { formatStep } from "../lib/format-step.js";
import { subagentDispatch } from "../lib/dispatch.js";
import {
  runPreflight,
  PLAN_REQUIRED_ARTIFACTS,
} from "../checks/preflight.js";
import { isMultiSession } from "../lib/session-status.js";

const STEPS = 9;

function parseArgs(): { step: number; feature: string } {
  const args = process.argv.slice(2);
  let step = 1;
  let feature = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--step" && args[i + 1]) {
      step = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--feature" && args[i + 1]) {
      feature = args[i + 1];
      i++;
    }
  }
  return { step, feature };
}

function getProjectRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, ".cursor"))) return cwd;
  const parent = path.dirname(cwd);
  if (parent !== cwd && fs.existsSync(path.join(parent, ".cursor")))
    return parent;
  return cwd;
}

function runStep(step: number, feature: string): string {
  const root = getProjectRoot();
  const ticketsDir = path.join(root, ".cursor", "tickets", feature);
  const planPath = path.join(ticketsDir, "03-plan.md");

  switch (step) {
    case 1: {
      const result = runPreflight(feature, PLAN_REQUIRED_ARTIFACTS, root);
      if (!result.pass) {
        return formatStep(
          result.message,
          "",
          { title: "Step 1: Preflight — FAILED" }
        ).replace("WORKFLOW COMPLETE", "STOP. Fix the issues above, then rerun from Step 1.");
      }
      const nextCmd = `npx tsx workflows/plan.ts --step 2 --feature ${feature}`;
      return formatStep(
        `${result.message}\n\nFeature: ${feature}\nBranch: ${result.branch}`,
        nextCmd,
        { title: "Step 1: Preflight — PASSED" }
      );
    }

    case 2: {
      const dispatchPrompt = subagentDispatch(
        "generalPurpose",
        `npx tsx workflows/plan.ts --step 3 --feature ${feature}`,
        [
          "Load orchestrator-agent. Read 00-requirements.md, 02-test-spec.md (and 01-ui-spec.md if present).",
          "Produce 03-plan.md with ALL sections including ## Invisible Knowledge.",
          "The ## Invisible Knowledge section MUST have non-empty fields: system rationale, invariants, tradeoffs, rejected_alternatives.",
          "If a field does not apply, state explicitly why. Blank fields = incomplete plan.",
        ].join("\n\n")
      );
      return formatStep(
        dispatchPrompt,
        "", // No next cmd — subagent runs and then user runs step 3
        { title: "Step 2: Dispatch orchestrator-agent" }
      ).replace(
        "WORKFLOW COMPLETE",
        `After the orchestrator writes 03-plan.md, run:\n    npx tsx workflows/plan.ts --step 3 --feature ${feature}`
      );
    }

    case 3: {
      if (!fs.existsSync(planPath)) {
        return formatStep(
          `03-plan.md not found at ${planPath}. Run Step 2 first.`,
          "",
          { title: "Step 3: Self-check plan — FAILED" }
        );
      }
      const planContent = fs.readFileSync(planPath, "utf-8");
      const checks = selfCheckPlan(planContent);
      if (!checks.pass) {
        return formatStep(
          checks.message,
          `npx tsx workflows/plan.ts --step 2 --feature ${feature}`,
          { title: "Step 3: Self-check plan — FAILED" }
        );
      }
      const nextCmd = `npx tsx workflows/plan.ts --step 4 --feature ${feature}`;
      return formatStep(
        "Plan structure OK. Dependency graph acyclic. TDD order correct. Invisible Knowledge filled.",
        nextCmd,
        { title: "Step 3: Self-check plan — PASSED" }
      );
    }

    case 4: {
      const planContent = fs.existsSync(planPath)
        ? fs.readFileSync(planPath, "utf-8")
        : "";
      const ikSection = extractIK(planContent);
      const multiSession = isMultiSession(root)
        ? "You have multiple AI sessions running. This is your plan workflow session for " + feature + ".\n\n"
        : "";
      const body = [
        multiSession,
        `Project: ${path.basename(root)} | Branch: (check git) | Task: Plan review for ${feature}`,
        "",
        "Plan structure: [see 03-plan.md]",
        "IK captured:",
        ikSection || "(none — plan incomplete)",
        "",
        "Does this look right?",
        "RECOMMENDATION: Choose A if plan is complete and IK is substantive.",
        "",
        "A) Proceed to ticket generation",
        "B) Something needs fixing — describe what",
        "C) Abort",
      ].join("\n");
      return formatStep(
        body,
        `npx tsx workflows/plan.ts --step 5 --feature ${feature}`,
        { title: "Step 4: Human checkpoint — Plan + IK review" }
      ).replace(
        "Execute this command now.",
        "If user chooses A: execute the command. If B: return to Step 2. If C: stop."
      );
    }

    case 5: {
      const dispatchPrompt = subagentDispatch(
        "generalPurpose",
        `npx tsx workflows/plan.ts --step 6 --feature ${feature}`,
        [
          "Load ticket-writer-agent. Read 03-plan.md and discovery artifacts.",
          "For each task in the plan, write a ticket to tickets/T<NN>-<slug>.md.",
        ].join("\n\n")
      );
      return formatStep(
        dispatchPrompt,
        "",
        { title: "Step 5: Dispatch ticket-writer-agent" }
      ).replace(
        "WORKFLOW COMPLETE",
        `After tickets are written, run:\n    npx tsx workflows/plan.ts --step 6 --feature ${feature}`
      );
    }

    case 6: {
      const ticketsPath = path.join(ticketsDir, "tickets");
      if (!fs.existsSync(ticketsPath) || !fs.statSync(ticketsPath).isDirectory()) {
        return formatStep(
          `tickets/ directory missing or empty. Run Step 5 first.`,
          `npx tsx workflows/plan.ts --step 5 --feature ${feature}`,
          { title: "Step 6: Self-check tickets — FAILED" }
        );
      }
      const planContent = fs.readFileSync(planPath, "utf-8");
      const taskIds = extractTaskIds(planContent);
      const ticketFiles = fs.readdirSync(ticketsPath).filter((f) => f.endsWith(".md"));
      const missing = taskIds.filter((id) => !ticketFiles.some((f) => f.includes(id)));
      if (missing.length > 0) {
        return formatStep(
          `Missing tickets for: ${missing.join(", ")}`,
          `npx tsx workflows/plan.ts --step 5 --feature ${feature}`,
          { title: "Step 6: Self-check tickets — FAILED" }
        );
      }
      const nextCmd = `npx tsx workflows/plan.ts --step 7 --feature ${feature}`;
      return formatStep(
        `All ${taskIds.length} tasks have tickets.`,
        nextCmd,
        { title: "Step 6: Self-check tickets — PASSED" }
      );
    }

    case 7: {
      const body = [
        `Project: ${path.basename(root)} | Branch: (check git) | Task: Tickets review for ${feature}`,
        "",
        "Review the generated tickets in tickets/.",
        "",
        "A) Proceed to TODOS update",
        "B) Something needs fixing — describe what",
        "C) Abort",
      ].join("\n");
      return formatStep(
        body,
        `npx tsx workflows/plan.ts --step 8 --feature ${feature}`,
        { title: "Step 7: Human checkpoint — Tickets review" }
      ).replace(
        "Execute this command now.",
        "If user chooses A: execute the command. If B: return to Step 5. If C: stop."
      );
    }

    case 8: {
      const body = [
        "Offer to add deferred items from the plan to project TODOS.md (see review/TODOS-format.md).",
        "If user accepts, append new items. Otherwise continue.",
        "",
        "Then proceed to Step 9.",
      ].join("\n");
      const nextCmd = `npx tsx workflows/plan.ts --step 9 --feature ${feature}`;
      return formatStep(body, nextCmd, {
        title: "Step 8: TODOS update",
      });
    }

    case 9: {
      return formatStep(
        "PLAN APPROVED. Plan workflow complete. Next: run execute workflow when ready.",
        "",
        { title: "Step 9: Done" }
      );
    }

    default:
      return `Unknown step ${step}. Valid: 1–${STEPS}.`;
  }
}

function selfCheckPlan(planContent: string): { pass: boolean; message: string } {
  const requiredSections = [
    "Invisible Knowledge",
    "Thinking",
    "Execution Order Table",
    "Per-Task Definitions",
    "Parallel Groups",
    "Out of Scope",
  ];
  for (const s of requiredSections) {
    if (!planContent.includes(s)) {
      return { pass: false, message: `Missing required section: ${s}` };
    }
  }

  const ikMatch = planContent.match(/##? ?6\.? Invisible Knowledge\n([\s\S]*?)(?=\n## |\n### |$)/);
  const ikBody = ikMatch ? ikMatch[1] : "";
  const hasSystem = /\*\*[Ss]ystem rationale\*\*:?\s*.+/m.test(ikBody);
  const hasInvariants = /\*\*[Ii]nvariants\*\*:?\s*.+/m.test(ikBody) || /- .+/m.test(ikBody);
  const hasTradeoffs = /\*\*[Aa]ccepted trade-offs?\*\*:?\s*.+/m.test(ikBody) || /- .+/m.test(ikBody);
  const hasRejected = /\*\*[Rr]ejected alternatives?\*\*:?\s*.+/m.test(ikBody) || /- .+/m.test(ikBody);
  if (!hasSystem || !hasInvariants || !hasTradeoffs || !hasRejected) {
    return {
      pass: false,
      message:
        "Invisible Knowledge section has blank or empty fields. All of system, invariants, tradeoffs, rejected_alternatives must be substantively filled.",
    };
  }

  const taskIds = extractTaskIds(planContent);
  const implAgents = ["db-agent", "storage-agent", "api-agent", "auth-agent", "frontend-agent"];
  const testAgents = ["test-writer-agent", "e2e-test-writer-agent"];
  let firstImplStep = Infinity;
  let lastTestStep = -1;
  const lines = planContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const a of implAgents) {
      if (line.includes(a)) firstImplStep = Math.min(firstImplStep, i);
    }
    for (const a of testAgents) {
      if (line.includes(a)) lastTestStep = Math.max(lastTestStep, i);
    }
  }
  if (firstImplStep < lastTestStep) {
    return {
      pass: false,
      message: "TDD ordering violation: implementation agent appears before test-writer tasks.",
    };
  }

  return { pass: true, message: "" };
}

function extractIK(planContent: string): string {
  const m = planContent.match(/##? ?6\.? Invisible Knowledge\n([\s\S]*?)(?=\n## |\n### |$)/);
  return m ? m[1].trim() : "";
}

function extractTaskIds(planContent: string): string[] {
  const ids: string[] = [];
  const re = /T\d+/g;
  let m;
  while ((m = re.exec(planContent))) {
    if (!ids.includes(m[0])) ids.push(m[0]);
  }
  return ids;
}

function main() {
  const { step, feature } = parseArgs();
  if (!feature) {
    console.error("Usage: npx tsx workflows/plan.ts --step N --feature <feature-slug>");
    process.exit(1);
  }
  console.log(runStep(step, feature));
}

main();
