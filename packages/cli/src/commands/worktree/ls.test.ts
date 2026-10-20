import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../../output/index.js";
import { toWorktreeLsResult } from "./ls.js";

describe("worktree ls output paths", () => {
  const home = "/home/tester";
  const worktreePath = "/home/tester/.paseo/worktrees/repo/feature";
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.HOME;
    process.env.HOME = home;
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  });

  const result = () =>
    toWorktreeLsResult(
      [{ worktreePath, branchName: "feature" }],
      [{ id: "2d85f428-fdaf-4d98-906f-c583de2b805f", cwd: worktreePath }],
    );

  it("emits absolute cwd paths in JSON output", () => {
    const listed = JSON.parse(render(result(), { format: "json" })) as Array<{
      name: string;
      branch: string;
      cwd: string;
      agent: string;
    }>;
    expect(listed).toEqual([
      { name: "feature", branch: "feature", cwd: worktreePath, agent: "2d85f42" },
    ]);
  });

  it("emits absolute cwd paths in YAML output", () => {
    expect(render(result(), { format: "yaml" })).toContain(`cwd: ${worktreePath}`);
  });

  it("shortens the home directory in table output", () => {
    const table = render(result(), { format: "table", noColor: true });
    expect(table).toContain("~/.paseo/worktrees/repo/feature");
    expect(table).not.toContain(worktreePath);
  });
});
