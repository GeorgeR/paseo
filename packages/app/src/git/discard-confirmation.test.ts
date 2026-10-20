import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n/i18next";

import { buildDiscardConfirmationMessage, isDiscardTargetConflicted } from "./discard-confirmation";

const t = i18n.t.bind(i18n);

describe("buildDiscardConfirmationMessage", () => {
  it("warns that the merge's incoming changes are lost when the file is conflicted", () => {
    expect(buildDiscardConfirmationMessage({ path: "src/app.ts", conflicted: true, t })).toBe(
      'Changes to "src/app.ts" will be permanently discarded.\n\n' +
        "This file has a merge conflict, so the merge's incoming changes will also be lost.",
    );
  });

  it("omits the merge warning when the file is not conflicted", () => {
    expect(buildDiscardConfirmationMessage({ path: "src/app.ts", conflicted: false, t })).toBe(
      'Changes to "src/app.ts" will be permanently discarded.',
    );
  });
});

describe("isDiscardTargetConflicted", () => {
  const files = [
    { path: "src/app.ts", conflicted: true },
    { path: "src/other.ts" },
    { path: "docs/readme.md", conflicted: false },
  ];

  it("is true for a conflicted file and for a folder that contains one", () => {
    expect(isDiscardTargetConflicted(files, "src/app.ts")).toBe(true);
    expect(isDiscardTargetConflicted(files, "src")).toBe(true);
  });

  it("is false for clean files, clean folders and sibling paths sharing a prefix", () => {
    expect(isDiscardTargetConflicted(files, "src/other.ts")).toBe(false);
    expect(isDiscardTargetConflicted(files, "docs")).toBe(false);
    expect(isDiscardTargetConflicted(files, "src/app")).toBe(false);
  });
});
