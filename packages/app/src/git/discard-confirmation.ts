/**
 * Discarding a conflicted file restores it to HEAD, which also drops the
 * merge's incoming side, so the confirmation says so.
 */
export function buildDiscardConfirmationMessage(input: {
  path: string;
  conflicted: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}): string {
  const message = input.t("workspace.fileActions.confirmRevert.message", { name: input.path });
  if (!input.conflicted) {
    return message;
  }
  return `${message}\n\n${input.t("workspace.fileActions.confirmRevert.conflictWarning")}`;
}

/** A discard target is a file path or a folder path from the Changes tree. */
export function isDiscardTargetConflicted(
  files: readonly { path: string; conflicted?: boolean }[],
  path: string,
): boolean {
  const folderPrefix = `${path}/`;
  return files.some(
    (file) =>
      file.conflicted === true && (file.path === path || file.path.startsWith(folderPrefix)),
  );
}
