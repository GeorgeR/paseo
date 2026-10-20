import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import type { ForgeService } from "../services/forge-service.js";
import { createWorktreeCore } from "./worktree-core.js";

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

function commitAll(cwd: string, message: string): void {
  git(cwd, ["add", "-A"]);
  git(cwd, ["-c", "commit.gpgsign=false", "commit", "-m", message]);
}

function writeSetupConfig(dir: string, marker: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "paseo.json"),
    JSON.stringify({ worktree: { setup: [`echo ${marker} > ${marker}`] } }),
  );
}

// repo/paseo.json and repo/sub/paseo.json each write their own marker file in the setup cwd.
function createNestedProjectRepo(): { tempDir: string; repoDir: string; paseoHome: string } {
  const tempDir = realpathSync(mkdtempSync(path.join(tmpdir(), "worktree-core-setup-")));
  const repoDir = path.join(tempDir, "repo");
  const paseoHome = path.join(tempDir, ".paseo");
  mkdirSync(repoDir, { recursive: true });
  git(repoDir, ["init", "-b", "main"]);
  git(repoDir, ["config", "user.email", "test@test.com"]);
  git(repoDir, ["config", "user.name", "Test"]);
  git(repoDir, ["config", "core.autocrlf", "false"]);
  writeSetupConfig(repoDir, "root-setup-ran");
  writeSetupConfig(path.join(repoDir, "sub"), "sub-setup-ran");
  commitAll(repoDir, "initial");
  return { tempDir, repoDir, paseoHome };
}

function createCoreDeps(repoDir: string) {
  return {
    github: {} as ForgeService,
    workspaceGitService: {
      resolveRepoRoot: async () => repoDir,
      getCheckout: async (cwd: string) => ({
        cwd,
        isGit: true,
        currentBranch: "main",
        remoteUrl: null,
        worktreeRoot: repoDir,
        isPaseoOwnedWorktree: false,
        mainRepoRoot: null,
      }),
      resolveForge: async () => null,
    },
    resolveDefaultBranch: async () => "main",
  };
}

describe("createWorktreeCore setup", () => {
  const cleanupPaths: string[] = [];

  afterEach(() => {
    for (const target of cleanupPaths.splice(0)) {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("runs setup from the nested project's folder with that folder's paseo.json", async () => {
    const { tempDir, repoDir, paseoHome } = createNestedProjectRepo();
    cleanupPaths.push(tempDir);

    const result = await createWorktreeCore(
      { cwd: path.join(repoDir, "sub"), worktreeSlug: "nested-setup", paseoHome },
      createCoreDeps(repoDir),
    );

    const worktreePath = result.worktree.worktreePath;
    expect(existsSync(path.join(worktreePath, "sub", "sub-setup-ran"))).toBe(true);
    expect(existsSync(path.join(worktreePath, "root-setup-ran"))).toBe(false);
    expect(existsSync(path.join(worktreePath, "sub", "root-setup-ran"))).toBe(false);
    expect(result.worktree.setupWarning).toBeUndefined();
  });

  test("skips setup with a warning when the project folder is missing on the worktree's branch", async () => {
    const { tempDir, repoDir, paseoHome } = createNestedProjectRepo();
    cleanupPaths.push(tempDir);
    git(repoDir, ["checkout", "-b", "without-sub"]);
    git(repoDir, ["rm", "-r", "-q", "sub"]);
    commitAll(repoDir, "remove sub");
    git(repoDir, ["checkout", "main"]);

    const result = await createWorktreeCore(
      {
        cwd: path.join(repoDir, "sub"),
        worktreeSlug: "missing-project",
        refName: "without-sub",
        paseoHome,
      },
      createCoreDeps(repoDir),
    );

    const worktreePath = result.worktree.worktreePath;
    expect(existsSync(worktreePath)).toBe(true);
    expect(existsSync(path.join(worktreePath, "sub"))).toBe(false);
    expect(existsSync(path.join(worktreePath, "root-setup-ran"))).toBe(false);
    expect(result.worktree.setupWarning).toContain("Skipped worktree setup");
    expect(result.worktree.setupWarning).toContain("sub");
  });

  test("runs setup from the worktree root when the project is the repository root", async () => {
    const { tempDir, repoDir, paseoHome } = createNestedProjectRepo();
    cleanupPaths.push(tempDir);

    const result = await createWorktreeCore(
      { cwd: repoDir, worktreeSlug: "root-setup", paseoHome },
      createCoreDeps(repoDir),
    );

    const worktreePath = result.worktree.worktreePath;
    expect(existsSync(path.join(worktreePath, "root-setup-ran"))).toBe(true);
    expect(existsSync(path.join(worktreePath, "sub", "sub-setup-ran"))).toBe(false);
    expect(result.worktree.setupWarning).toBeUndefined();
  });
});
