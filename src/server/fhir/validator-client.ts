/**
 * FHIR validator client (Section 10.6). POSTs a Bundle to
 * `<FHIR_VALIDATION_BASE_URL>/Bundle/$validate` and summarizes the
 * returned OperationOutcome. Pure parsing; transport errors throw
 * ValidatorError (retryable iff the failure looks transient).
 */
import type { Bundle, OperationOutcome } from "fhir/r4";

export interface ValidationIssue {
  severity: string;
  code?: string;
  diagnostics?: string;
  location?: string[];
}

export interface ValidationSummary {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
  outcome: OperationOutcome;
}

export class ValidatorError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ValidatorError";
    this.retryable = retryable;
  }
}

export function validationBaseUrl(): string {
  return (process.env.FHIR_VALIDATION_BASE_URL ?? "https://hapi.fhir.org/baseR4").replace(
    /\/+$/,
    ""
  );
}

function summarize(outcome: OperationOutcome): ValidationSummary {
  const issues: ValidationIssue[] = (outcome.issue ?? []).map((i) => ({
    severity: i.severity ?? "information",
    ...(i.code ? { code: i.code } : {}),
    ...(i.diagnostics ? { diagnostics: i.diagnostics } : {}),
    ...(i.location ? { location: i.location } : {}),
  }));
  const count = (levels: string[]) => issues.filter((i) => levels.includes(i.severity)).length;
  return {
    errorCount: count(["fatal", "error"]),
    warningCount: count(["warning"]),
    infoCount: count(["information"]),
    issues,
    outcome,
  };
}

export async function validateBundle(
  bundle: Bundle,
  timeoutMs = 60_000
): Promise<ValidationSummary> {
  let res: Response;
  try {
    res = await fetch(`${validationBaseUrl()}/Bundle/$validate`, {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json", Accept: "application/fhir+json" },
      body: JSON.stringify(bundle),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ValidatorError("FHIR validator timed out.", false);
    }
    throw new ValidatorError(`FHIR validator unreachable: ${(err as Error).message}`, true);
  }
  // Some servers answer non-2xx with a usable OperationOutcome body.
  const text = await res.text();
  let outcome: OperationOutcome | null = null;
  try {
    const parsed = JSON.parse(text) as OperationOutcome;
    if (parsed?.resourceType === "OperationOutcome") outcome = parsed;
  } catch {
    outcome = null;
  }
  if (outcome) return summarize(outcome);
  throw new ValidatorError(`FHIR validator error ${res.status}.`, res.status >= 500);
}
