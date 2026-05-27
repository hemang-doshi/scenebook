import { expect, test } from "@playwright/test";

test("creator can move from idea capture to a learning loop in database mode", async ({
  page,
}) => {
  const runId = Date.now().toString();
  const projectTitle = `3 desk tweaks that fixed my creator setup ${runId}`;

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`creator-${runId}@example.com`);
  await page.getByLabel("Password").fill("SuperSecretPass123!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("main").getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project title").fill(projectTitle);
  await page.getByLabel("Format").click();
  await page.getByRole("button", { name: "SHORT", exact: true }).click();
  await page.getByLabel("Platform").click();
  await page.getByRole("button", { name: "YOUTUBE", exact: true }).click();
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Open Agent" }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Open Editor" }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "View Analytics" }).first()).toBeVisible({ timeout: 20_000 });

  const projectPath = new URL(page.url()).pathname;
  const cardId = projectPath.split("/").pop();

  if (!cardId) {
    throw new Error("Expected project URL to include a project ID.");
  }

  await page.getByRole("button", { name: "Open Agent" }).first().click();
  await expect(page.getByRole("button", { name: /Project hub/i })).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder(/Ask the agent/i).fill("/script sharp desk-setup cold open");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Hook:")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Script Builder")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Assets" }).click();
  await expect(page.getByText("Asset Library")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Close asset drawer" }).click();
  await page.getByRole("button", { name: /Project hub/i }).click();

  await expect(page.getByRole("heading", { name: "Continue in Agent" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Generated Assets" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Next Best Actions" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("/script", { exact: true })).toBeVisible();

  await page.locator(`a[href="/editor/${cardId}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/editor/${cardId}$`));
  await page.goto("/board");

  await expect(
    page.getByRole("heading", { name: "Production Board" }),
  ).toBeVisible();

  await page.request.fetch(`/api/cards/${cardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    data: {
      status: "posted",
      analyticsJournal: {
        reflection: "Fast pacing worked better than the slower version.",
        followUpIdea: "Part two with the sound setup improvements",
      },
    },
  });

  await page.goto(projectPath);
  await expect(page.getByText("Fast pacing worked better than the slower version.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Part two with the sound setup improvements")).toBeVisible({ timeout: 20_000 });
});
