export type QRStatus = "pass" | "fail";

export type LoopState = "initial" | "retry";

export interface StepResult {
  output: string;
  nextCmd?: string;
}
