import type { AgentSnapshotPayload } from "@getpaseo/protocol/messages";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../../output/index.js";
import { agentLsSchema, buildAgentLsFetchOptions, toListItem } from "./ls.js";

describe("buildAgentLsFetchOptions", () => {
  it("fetches active agents by default", () => {
    expect(buildAgentLsFetchOptions({})).toEqual({
      scope: "active",
    });
  });

  it("keeps label and thinking filters within the active scope", () => {
    expect(
      buildAgentLsFetchOptions({
        label: ["surface=workspace"],
        thinking: " medium ",
      }),
    ).toEqual({
      scope: "active",
      filter: {
        labels: { surface: "workspace" },
        thinkingOptionId: "medium",
      },
    });
  });

  it("asks the daemon for internal agents only with --internal", () => {
    expect(buildAgentLsFetchOptions({ background: true, global: true })).toEqual({
      filter: { includeBackground: true },
    });
  });

  it("fetches global non-archived agents for -g", () => {
    expect(buildAgentLsFetchOptions({ global: true })).toEqual({});
  });

  it("includes archived and background agents with -a", () => {
    expect(buildAgentLsFetchOptions({ all: true })).toEqual({
      filter: {
        includeArchived: true,
        includeBackground: true,
      },
    });
  });

  it("fetches all global agents for -a -g", () => {
    expect(buildAgentLsFetchOptions({ all: true, global: true })).toEqual({
      filter: {
        includeArchived: true,
        includeBackground: true,
      },
    });
  });

  it("applies filters to global queries", () => {
    expect(
      buildAgentLsFetchOptions({
        global: true,
        label: ["surface=workspace"],
        thinking: " medium ",
      }),
    ).toEqual({
      filter: {
        labels: { surface: "workspace" },
        thinkingOptionId: "medium",
      },
    });
  });
});

describe("agent ls output paths", () => {
  const home = "/home/tester";
  const agentCwd = "/home/tester/projects/app";
  const agent = {
    id: "2d85f428-fdaf-4d98-906f-c583de2b805f",
    title: "Agent",
    provider: "claude",
    status: "idle",
    cwd: agentCwd,
    createdAt: new Date().toISOString(),
    labels: {},
  } as AgentSnapshotPayload;
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

  const result = () => ({
    type: "list" as const,
    data: [toListItem(agent)],
    schema: agentLsSchema,
  });

  it("emits absolute cwd paths in JSON output", () => {
    const listed = JSON.parse(render(result(), { format: "json" })) as Array<{ cwd: string }>;
    expect(listed.map((item) => item.cwd)).toEqual([agentCwd]);
  });

  it("emits absolute cwd paths in YAML output", () => {
    expect(render(result(), { format: "yaml" })).toContain(`cwd: ${agentCwd}`);
  });

  it("shortens the home directory in table output", () => {
    const table = render(result(), { format: "table", noColor: true });
    expect(table).toContain("~/projects/app");
    expect(table).not.toContain(agentCwd);
  });
});
