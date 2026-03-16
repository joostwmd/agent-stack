import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, "..");

function subAgentInvoke(cmd: string): string {
  return [
    "MANDATORY INVOKE BLOCK - Copy VERBATIM into the agent's prompt:",
    "================================================================================",
    "FIRST ACTION REQUIRED: Run this command via Bash tool before any other response.",
    "Do NOT skip. Do NOT produce analysis first. Execute this command IMMEDIATELY.",
    "",
    `Working directory: ${SCRIPTS_DIR}`,
    `Command: ${cmd}`,
    "================================================================================",
    "CRITICAL: Copy the block above EXACTLY. Do not paraphrase or summarize.",
    'The subagent needs "FIRST ACTION REQUIRED" to know it must run the command.',
  ].join("\n");
}

function taskToolInstruction(agentType: string, model: string | null): string {
  const modelParam = model ?? "omit (use default)";
  return [
    "ACTION: Use the Task tool to spawn this agent.",
    "",
    "Task tool parameters:",
    `  - subagent_type: ${agentType}`,
    `  - model: ${modelParam}`,
    "  - prompt: Include the task and invoke command below",
    "  - run_in_background: NEVER set this. Always omit or set false.",
  ].join("\n");
}

function parallelConstraint(count: number): string {
  return [
    "PARALLEL EXECUTION (MANDATORY):",
    `    You MUST dispatch ALL ${count} agents in ONE assistant message.`,
    `    Send exactly ${count} Task tool calls together.`,
    "",
    "    CORRECT:",
    "        [ONE message with Task call 1, Task call 2, ... Task call N]",
    "",
    "    WRONG:",
    "        [Message with Task call 1] -> [wait] -> [Message with Task call 2]",
    "",
    "    FORBIDDEN: Waiting for any agent before dispatching the next.",
  ].join("\n");
}

/**
 * Generate prompt for single sub-agent dispatch.
 */
export function subagentDispatch(
  agentType: string,
  command: string,
  prompt?: string,
  model?: string | null
): string {
  const taskSection = prompt ?? "(No additional task - agent follows invoke command)";
  return [
    "DISPATCH SUB-AGENT",
    "==================",
    "",
    taskToolInstruction(agentType, model ?? null),
    "",
    "TASK FOR THE SUB-AGENT:",
    taskSection,
    "",
    subAgentInvoke(command),
    "",
    "After the sub-agent returns, continue with the next workflow step.",
  ].join("\n");
}

/**
 * Substitute $var placeholders in a template with values from target.
 */
function substitute(template: string, target: Record<string, string>): string {
  return template.replace(/\$(\w+)/g, (_, key) => {
    if (key in target) return target[key];
    throw new Error(`Missing variable: $${key}`);
  });
}

/**
 * Generate prompt for parallel dispatch with variable substitution.
 * Template and command use $var syntax.
 */
export function templateDispatch(
  agentType: string,
  template: string,
  targets: Record<string, string>[],
  command: string,
  model?: string | null,
  instruction?: string
): string {
  const expanded = targets.map((t) => ({
    prompt: substitute(template, t),
    command: substitute(command, t),
  }));
  const count = expanded.length;
  const modelDisplay = model ?? "default (omit parameter)";
  const instructionSection = instruction ? `NOTE: ${instruction}\n\n` : "";
  const agentsSection = expanded
    .map(
      (e, i) =>
        [
          `--- Agent ${i + 1} ---`,
          `Task: ${e.prompt}`,
          "",
          subAgentInvoke(e.command),
        ].join("\n")
    )
    .join("\n\n");

  return [
    `DISPATCH ${count} PARALLEL AGENTS`,
    "================================",
    "",
    parallelConstraint(count),
    "",
    "For EACH agent below, use Task tool with:",
    `  - subagent_type: ${agentType}`,
    `  - model: ${modelDisplay}`,
    "  - prompt: Task description + MANDATORY INVOKE BLOCK (copy exactly as shown)",
    "",
    "PROMPT CONSTRUCTION RULES:",
    '  - The MANDATORY INVOKE BLOCK must appear VERBATIM in each prompt',
    '  - DO NOT reduce it to just "Working directory: X / Command: Y"',
    '  - The subagent needs "FIRST ACTION REQUIRED" to execute the command',
    "",
    instructionSection,
    "AGENTS:",
    agentsSection,
    "",
    `After ALL ${count} agents return, continue with the next workflow step.`,
  ].join("\n");
}

/**
 * Generate prompt for parallel dispatch with unique tasks per agent.
 * Each agent receives sharedContext + their unique task + the fixed command.
 */
export function rosterDispatch(
  agentType: string,
  agents: string[],
  command: string,
  sharedContext?: string,
  model?: string | null,
  instruction?: string
): string {
  const count = agents.length;
  const modelDisplay = model ?? "default (omit parameter)";
  const instructionSection = instruction ? `NOTE: ${instruction}\n\n` : "";
  const sharedContextSection = sharedContext
    ? `SHARED CONTEXT (include in every agent's prompt):\n${sharedContext}\n\n`
    : "";
  const agentsSection = agents
    .map(
      (task, i) =>
        [
          `--- Agent ${i + 1} ---`,
          `Unique Task: ${task}`,
          "",
          subAgentInvoke(command),
        ].join("\n")
    )
    .join("\n\n");

  return [
    `DISPATCH ${count} PARALLEL AGENTS`,
    "================================",
    "",
    parallelConstraint(count),
    "",
    "For EACH agent below, use Task tool with:",
    `  - subagent_type: ${agentType}`,
    `  - model: ${modelDisplay}`,
    "  - prompt: Shared context + agent's unique task + MANDATORY INVOKE BLOCK (copy exactly)",
    "",
    "PROMPT CONSTRUCTION RULES:",
    '  - The MANDATORY INVOKE BLOCK must appear VERBATIM in each prompt',
    '  - DO NOT reduce it to just "Working directory: X / Command: Y"',
    '  - The subagent needs "FIRST ACTION REQUIRED" to execute the command',
    "",
    instructionSection,
    sharedContextSection,
    "AGENTS:",
    agentsSection,
    "",
    `After ALL ${count} agents return, continue with the next workflow step.`,
  ].join("\n");
}
