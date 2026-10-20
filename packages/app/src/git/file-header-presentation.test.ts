import { describe, expect, it } from "vitest";
import { allocateDiffHeaderTextWidths, diffFileChangeKind } from "./file-header-presentation";

describe("diff file header text allocation", () => {
  it("gives the filename its full width before truncating the directory", () => {
    expect(
      allocateDiffHeaderTextWidths({ available: 120, nameWidth: 80, directoryWidth: 100 }),
    ).toEqual({ name: 80, directory: 36 });
  });

  it("uses all available width for a filename that cannot fit", () => {
    expect(
      allocateDiffHeaderTextWidths({ available: 60, nameWidth: 80, directoryWidth: 100 }),
    ).toEqual({ name: 60, directory: 0 });
  });

  it("does not truncate a fitting filename merely to reserve the gap", () => {
    expect(
      allocateDiffHeaderTextWidths({ available: 82, nameWidth: 80, directoryWidth: 100 }),
    ).toEqual({ name: 80, directory: 0 });
  });
});

describe("diff file change kind", () => {
  it("reports a conflicted file as conflicted rather than modified", () => {
    expect(diffFileChangeKind({ isNew: false, isDeleted: false, conflicted: true })).toBe(
      "conflicted",
    );
  });

  it("reports a file without the conflicted flag by its change kind", () => {
    expect(diffFileChangeKind({ isNew: false, isDeleted: false })).toBe("modified");
    expect(diffFileChangeKind({ isNew: true, isDeleted: false, conflicted: false })).toBe("added");
    expect(diffFileChangeKind({ isNew: false, isDeleted: true })).toBe("deleted");
  });
});
