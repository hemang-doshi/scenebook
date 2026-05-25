import { expect, test } from "@playwright/test";

test("creator can move from idea capture to a learning loop in database mode", async ({
  page,
}) => {
  const runId = Date.now().toString();
  const inboxTitle = `Desk tweaks that improved my filming ${runId}`;
  const cardTitle = `3 desk tweaks that fixed my creator setup ${runId}`;

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`creator-${runId}@example.com`);
  await page.getByLabel("Password").fill("SuperSecretPass123!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Creator Dashboard" })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("complementary").getByRole("link", { name: "Inbox" }).click();
  await page.getByLabel("Quick capture thought").fill(`${inboxTitle}\nFocus on lighting and cable cleanup as the hero detail.`);
  await page.getByRole("button", { name: "Capture idea" }).click();

  await expect(page.getByText(inboxTitle)).toBeVisible();
  await page.locator("div.rounded-xl").filter({ hasText: inboxTitle }).getByRole("button", { name: "Convert to Project Card" }).first().click();
  await page.getByLabel("Card Title").fill(cardTitle);
  
  // Custom select interactions for Format
  await page.getByLabel("Format").click();
  await page.getByRole("button", { name: "SHORT", exact: true }).click();

  // Custom select interactions for Platform
  await page.getByLabel("Platform").click();
  await page.getByRole("button", { name: "YOUTUBE", exact: true }).click();

  await page.getByRole("button", { name: "Promote to Card" }).click();

  await expect(page.getByRole("heading", { name: cardTitle })).toBeVisible({ timeout: 20_000 });

  const cardPath = new URL(page.url()).pathname;
  const cardId = cardPath.split("/").pop();

  if (!cardId) {
    throw new Error("Expected card detail URL to include a card ID.");
  }

  // 1. Fill Notion-style Hook block
  const hookBlock = page.locator("div.group").filter({ hasText: "Hook (Visual & Spoken)" }).locator("div.cursor-text");
  await hookBlock.click();
  const hookTextarea = page.locator("div.group").filter({ hasText: "Hook (Visual & Spoken)" }).locator("textarea");
  await hookTextarea.fill("I thought I needed new gear. I needed three tiny desk fixes.");
  await hookTextarea.blur();

  // 2. Fill Notion-style Script block
  const scriptBlock = page.locator("div.group").filter({ hasText: "Full Narrated Script" }).locator("div.cursor-text");
  await scriptBlock.click();
  const scriptTextarea = page.locator("div.group").filter({ hasText: "Full Narrated Script" }).locator("textarea");
  await scriptTextarea.fill("Open on the messy desk, then walk through the three changes in order.");
  await scriptTextarea.blur();

  // 3. Generate AI Hook asset
  await page.getByRole("button", { name: "Gen Hook" }).click();
  await expect(page.getByText("AI Generated Hook")).toBeVisible({ timeout: 20_000 });

  // 4. Tasks View: Add a checklist item and complete it
  await page.getByRole("button", { name: "Tasks" }).click();
  await page.getByRole("button", { name: "Add checklist task" }).click();
  await page.getByLabel("New A-roll item").fill("Intro line at desk");
  await page.getByRole("button", { name: "Save task" }).click();
  await page.getByLabel("Checklist Intro line at desk").check();

  // 5. Generate AI B-Roll asset to satisfy asset readiness
  await page.getByRole("button", { name: "Docs" }).click();
  await page.getByRole("button", { name: "Gen B-Roll" }).click();
  await expect(page.getByText("AI B-Roll Concept")).toBeVisible({ timeout: 20_000 });

  // 6. View SceneStudio and check Media panel
  await page.getByRole("button", { name: "Studio" }).click();
  await expect(page.getByText("Project Media")).toBeVisible();
  await page.getByRole("button", { name: "Docs" }).click();
  await page.goto("/board");

  await expect(
    page.getByRole("heading", { name: "Production Board" }),
  ).toBeVisible();

  // 7. Update status programmatically because Board has been redesigned to use drag-and-drop
  await page.evaluate(async (id) => {
    await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "posted" }),
    });
  }, cardId);

  await page.goto(cardPath);
  await page.getByRole("button", { name: "Analytics" }).click();
  await page.getByLabel("Total Views").fill("14500");
  await page.getByLabel("Total Likes").fill("1100");
  
  // Custom select interactions for Publish Decision
  await page.getByLabel("Publish Decision").click();
  await page.getByRole("button", { name: "Repeat (Highly successful, double down)", exact: true }).click();

  await page.getByLabel(/Follow-up Script Docs/i).fill(
    "Part two with the sound setup improvements",
  );
  await page.getByRole("button", { name: "Save Reflection & Close Loop" }).click();

  await expect(page.getByText("Part two with the sound setup improvements")).toBeVisible();
});
