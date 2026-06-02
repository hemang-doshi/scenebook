import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const root = process.cwd();

function repoPath(...parts: string[]) {
  return path.join(root, ...parts);
}

describe("SceneBook design source", () => {
  test("canonical design pack files are installed in docs/design", () => {
    const expectedFiles = [
      "README.md",
      "design.md",
      "brand-pack.md",
      "motion-pack.md",
      "implementation-pack.md",
      "source/Pasted-code.html",
      "assets/logos/scenebook-mark-dark.svg",
      "assets/logos/scenebook-mark-light.svg",
      "tokens/scenebook.tokens.css",
      "tokens/scenebook.tokens.json",
      "tokens/scenebook.motion.css",
      "tokens/scenebook.motion.ts",
      "screen-map.md",
      "migration-plan.md",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(repoPath("docs", "design", file)), file).toBe(true);
    }
  });

  test("public brand marks are available for app surfaces", () => {
    expect(existsSync(repoPath("public", "brand", "scenebook-mark-dark.svg"))).toBe(true);
    expect(existsSync(repoPath("public", "brand", "scenebook-mark-light.svg"))).toBe(true);
  });

  test("root DESIGN.md points to the SceneBook brand system, not the old Notion analysis", () => {
    const design = readFileSync(repoPath("DESIGN.md"), "utf8");

    expect(design).toContain("# SceneBook Design System");
    expect(design).toContain("docs/design");
    expect(design).not.toContain("Notion-design-analysis");
  });
});
