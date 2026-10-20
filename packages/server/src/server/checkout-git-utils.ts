import {
  MergeConflictError,
  MergeFromBaseConflictError,
  NotGitRepoError,
} from "../utils/checkout-git.js";
import { runGitCommand } from "../utils/run-git-command.js";

export const READ_ONLY_GIT_ENV = {
  GIT_OPTIONAL_LOCKS: "0",
} as const;

const SAFE_GIT_REF_PATTERN = /^[A-Za-z0-9._/-]+$/;

/**
 * The check every Paseo branch input passes: plain ref characters only, no revision ranges, no
 * reflog syntax, and no leading `-` that Git would read as an option.
 */
export function isSafeGitRef(ref: string): boolean {
  return (
    SAFE_GIT_REF_PATTERN.test(ref) &&
    !ref.startsWith("-") &&
    !ref.includes("..") &&
    !ref.includes("@{")
  );
}

export type CheckoutErrorCode = "NOT_GIT_REPO" | "NOT_ALLOWED" | "MERGE_CONFLICT" | "UNKNOWN";

export interface CheckoutErrorPayload {
  code: CheckoutErrorCode;
  message: string;
}

export async function resolveCheckoutGitDir(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await runGitCommand(["rev-parse", "--absolute-git-dir"], {
      cwd,
      envOverlay: READ_ONLY_GIT_ENV,
    });
    const gitDir = stdout.trim();
    return gitDir.length > 0 ? gitDir : null;
  } catch {
    return null;
  }
}

export function toCheckoutError(error: unknown): CheckoutErrorPayload {
  if (error instanceof NotGitRepoError) {
    return { code: "NOT_GIT_REPO", message: error.message };
  }
  if (error instanceof MergeConflictError) {
    return { code: "MERGE_CONFLICT", message: error.message };
  }
  if (error instanceof MergeFromBaseConflictError) {
    return { code: "MERGE_CONFLICT", message: error.message };
  }
  if (error instanceof Error) {
    return { code: "UNKNOWN", message: error.message };
  }
  return { code: "UNKNOWN", message: String(error) };
}
