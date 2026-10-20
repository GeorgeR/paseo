import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { getCommitFileDiff } from "./checkout-git.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "commit-file-diff-test-")));
  tempDirs.push(dir);
  return dir;
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd }).toString();
}

function commitFile(repoDir: string, name: string, content: string, message: string): void {
  writeFileSync(join(repoDir, name), content);
  git(["add", "."], repoDir);
  git(["-c", "commit.gpgsign=false", "commit", "-m", message], repoDir);
}

function initRepo(): string {
  const tempDir = makeTempDir();
  const repoDir = join(tempDir, "repo");
  mkdirSync(repoDir, { recursive: true });
  git(["init", "-b", "main"], repoDir);
  git(["config", "user.email", "test@test.com"], repoDir);
  git(["config", "user.name", "Test User"], repoDir);
  return repoDir;
}

function headSha(repoDir: string): string {
  return git(["rev-parse", "HEAD"], repoDir).trim();
}

describe("getCommitFileDiff", () => {
  it("returns the parsed diff for a modified file in a commit", async () => {
    const repoDir = initRepo();
    commitFile(repoDir, "foo.txt", "a\nb\nc\n", "initial");
    commitFile(repoDir, "foo.txt", "a\nB\nc\nd\n", "edit foo");
    const sha = headSha(repoDir);

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "foo.txt" });

    expect(file).not.toBeNull();
    expect(file?.path).toBe("foo.txt");
    expect(file?.additions).toBe(2);
    expect(file?.deletions).toBe(1);
    expect(file?.hunks.length).toBeGreaterThan(0);

    const lines = file?.hunks[0]?.lines ?? [];
    expect(lines.some((line) => line.type === "add" && line.content === "B")).toBe(true);
    expect(lines.some((line) => line.type === "add" && line.content === "d")).toBe(true);
    expect(lines.some((line) => line.type === "remove" && line.content === "b")).toBe(true);
  });

  it("returns a diff flagged as new for an added file", async () => {
    const repoDir = initRepo();
    commitFile(repoDir, "README.md", "base\n", "initial");
    commitFile(repoDir, "added.txt", "x\ny\n", "add file");
    const sha = headSha(repoDir);

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "added.txt" });

    expect(file?.path).toBe("added.txt");
    expect(file?.isNew).toBe(true);
    expect(file?.additions).toBe(2);
    expect(file?.deletions).toBe(0);
  });

  it("returns null for a path not changed in the commit", async () => {
    const repoDir = initRepo();
    commitFile(repoDir, "foo.txt", "a\n", "initial");
    commitFile(repoDir, "foo.txt", "a\nb\n", "edit foo");
    const sha = headSha(repoDir);

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "does-not-exist.txt" });

    expect(file).toBeNull();
  });

  it("pairs a rename in the commit and diffs the content against the old path", async () => {
    const repoDir = initRepo();
    commitFile(repoDir, "old.ts", "const a = 1;\nconst b = 2;\nconst c = 3;\n", "initial");
    git(["mv", "old.ts", "new.ts"], repoDir);
    commitFile(repoDir, "new.ts", "const a = 1;\nconst b = 20;\nconst c = 3;\n", "rename");
    const sha = headSha(repoDir);

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "new.ts" });

    expect(file?.path).toBe("new.ts");
    expect(file?.oldPath).toBe("old.ts");
    expect(file?.isNew).toBe(false);
    expect(file?.additions).toBe(1);
    expect(file?.deletions).toBe(1);
    const removed = file?.hunks[0]?.lines.find((line) => line.type === "remove");
    expect(removed?.content).toBe("const b = 2;");
    expect(removed?.tokens).toContainEqual({ text: "2", style: "number" });
  });

  it("matches a path with glob characters literally", async () => {
    const repoDir = initRepo();
    writeFileSync(join(repoDir, "a1.txt"), "one\n");
    commitFile(repoDir, "a[1].txt", "literal\n", "initial");
    commitFile(repoDir, "a1.txt", "one\ntwo\n", "edit a1 only");
    const sha = headSha(repoDir);

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "a[1].txt" });

    expect(file).toBeNull();
  });

  it("highlights a deleted file from history, not the recreated working-tree file", async () => {
    const repoDir = initRepo();
    commitFile(repoDir, "gone.ts", "const kept = 1;\n", "initial");
    git(["rm", "-q", "gone.ts"], repoDir);
    git(["-c", "commit.gpgsign=false", "commit", "-m", "delete"], repoDir);
    const sha = headSha(repoDir);
    writeFileSync(join(repoDir, "gone.ts"), "// unrelated working-tree content\n");

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "gone.ts" });

    expect(file?.isDeleted).toBe(true);
    const removed = file?.hunks[0]?.lines.find((line) => line.type === "remove");
    expect(removed?.content).toBe("const kept = 1;");
    expect(removed?.tokens).toContainEqual({ text: "1", style: "number" });
  });

  it("returns a merge commit diff against its first parent", async () => {
    const repoDir = initRepo();
    commitFile(repoDir, "README.md", "base\n", "initial");
    git(["checkout", "-b", "feature"], repoDir);
    commitFile(repoDir, "feature.txt", "feature\n", "add feature");
    git(["checkout", "main"], repoDir);
    commitFile(repoDir, "main.txt", "main\n", "advance main");
    git(["merge", "--no-ff", "feature", "-m", "merge feature"], repoDir);
    const sha = headSha(repoDir);

    const file = await getCommitFileDiff({ cwd: repoDir, sha, path: "feature.txt" });

    expect(file?.path).toBe("feature.txt");
    expect(file?.isNew).toBe(true);
    expect(file?.additions).toBe(1);
    expect(file?.deletions).toBe(0);
  });
});
