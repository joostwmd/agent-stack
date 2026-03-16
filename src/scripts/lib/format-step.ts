import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, "..");

export interface FormatStepOptions {
  title?: string;
  ifPass?: string;
  ifFail?: string;
}

/**
 * Assemble complete workflow step: title + body + NEXT STEP directive.
 *
 * @param body - Free-form prompt content (no wrapper needed)
 * @param nextCmd - Command for next step (empty signals completion)
 * @param options - Optional title, ifPass/ifFail for branching
 */
export function formatStep(
  body: string,
  nextCmd: string,
  options?: FormatStepOptions
): string {
  const { title, ifPass, ifFail } = options ?? {};
  let content = body;

  if (title) {
    content = `${title}\n${"=".repeat(title.length)}\n\n${content}`;
  }

  if (ifPass && ifFail) {
    const invoke = [
      "NEXT STEP (MANDATORY -- execute exactly one):",
      `    Working directory: ${SCRIPTS_DIR}`,
      `    ALL agents returned PASS  ->  ${ifPass}`,
      `    ANY agent returned FAIL   ->  ${ifFail}`,
      "",
      "This is a mechanical routing decision. Do not interpret, summarize, or assess the results.",
      "Count PASS vs FAIL, then execute the matching command.",
    ].join("\n");
    return `${content}\n\n${invoke}`;
  }

  if (nextCmd) {
    const invoke = [
      "NEXT STEP:",
      `    Working directory: ${SCRIPTS_DIR}`,
      `    Command: ${nextCmd}`,
      "",
      "Execute this command now.",
    ].join("\n");
    return `${content}\n\n${invoke}`;
  }

  return `${content}\n\nWORKFLOW COMPLETE - Return the output from the step above. Do not summarize.`;
}
