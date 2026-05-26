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

  const projectPath = new URL(page.url()).pathname;
  const cardId = projectPath.split("/").pop();

  if (!cardId) {
    throw new Error("Expected project URL to include a project ID.");
  }

  await page.getByRole("button", { name: "Script" }).click();
  await page.getByLabel("Hook").fill("I thought I needed new gear. I needed three tiny desk fixes.");
  await page.getByLabel("Script").fill("Open on the messy desk, then walk through the three changes in order.");
  await page.getByRole("button", { name: "Save script" }).click();

  // 1. Tasks view is available in the new project workspace
  await page.getByRole("button", { name: "Tasks" }).click();
  await expect(page.getByText("A-Roll")).toBeVisible();

  // 2. Editor handoff is visible from the project workspace
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  await expect(page.getByText("Open the live editor with project assets ready")).toBeVisible();
  await page.goto("/board");

  await expect(
    page.getByRole("heading", { name: "Production Board" }),
  ).toBeVisible();

  // 3. Update status programmatically because Board is drag-and-drop
  await page.request.fetch(`/api/cards/${cardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    data: { status: "posted" },
  });

  await page.goto(projectPath);
  await page.getByRole("button", { name: "Analytics" }).click();
  await page.getByLabel("Reflection").fill("Fast pacing worked better than the slower version.");
  await page.getByLabel("Follow-up idea").fill("Part two with the sound setup improvements");
  await page.getByRole("button", { name: "Save analytics" }).click();

  await expect(page.getByLabel("Follow-up idea")).toHaveValue("Part two with the sound setup improvements");
});
