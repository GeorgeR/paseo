import type { PaseoMetadataGeneration } from "@getpaseo/protocol/paseo-config-schema";
import { paseoConfigParseError, readPaseoConfig } from "./worktree.js";

export type MetadataConfigKey = "title" | "branchName" | "commitMessage" | "pullRequest";

// A style section carries the default guidance for one artifact. The project
// owner replaces it wholesale via paseo.json metadataGeneration.<configKey>.instructions
// — their text is used instead of the default, never appended alongside it, so the
// two never conflict. The contract block (what to produce, the JSON shape, and any
// correctness/safety rules) lives outside the sections and is never overridable.
export interface MetadataStyleSection {
  configKey: MetadataConfigKey;
  default: string;
  label?: string;
}

export interface BuildMetadataPromptOptions {
  // The workspace cwd: the project root, or the same project directory inside a
  // worktree. paseo.json is read from here, the root the project settings editor
  // writes to and scripts/setup read from, not from the Git top level, which
  // differs for a project nested inside a repository.
  cwd: string;
  contract: string;
  styles: MetadataStyleSection[];
  after: string;
  trailing?: string;
}

export async function buildMetadataPrompt(options: BuildMetadataPromptOptions): Promise<string> {
  const overrides = readProjectMetadataOverrides(options.cwd);
  const styleBlocks = options.styles.map((section) =>
    renderStyleSection(section, overrides?.[section.configKey]?.instructions),
  );
  const head = [options.contract, ...styleBlocks, options.after].join("\n\n");
  return options.trailing ? `${head}\n\n${options.trailing}` : head;
}

function renderStyleSection(section: MetadataStyleSection, override: string | undefined): string {
  const body = isNonEmptyString(override) ? override.trim() : section.default;
  return section.label ? `${section.label}:\n${body}` : body;
}

// A malformed paseo.json throws instead of silently falling back to the default
// styles, so the user learns their instructions are being ignored.
function readProjectMetadataOverrides(cwd: string): PaseoMetadataGeneration | undefined {
  const result = readPaseoConfig(cwd);
  if (!result.ok) {
    throw paseoConfigParseError(result);
  }
  return result.config?.metadataGeneration;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
