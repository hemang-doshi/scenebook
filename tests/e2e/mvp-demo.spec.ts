import { expect, test } from "@playwright/test";

test("creator can move from idea capture to a learning loop in sample mode", async ({
  page,
}) => {
  const runId = Date.now().toString();
  const inboxTitle = `Desk tweaks that improved my filming ${runId}`;
  const cardTitle = `3 desk tweaks that fixed my creator setup ${runId}`;

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter sample studio" }).click();

  await expect(page.getByRole("heading", { name: "Cinematic OS" })).toBeVisible();

  await page.getByRole("complementary").getByRole("link", { name: "Inbox" }).click();
  await page.getByLabel("Idea title").fill(inboxTitle);
  await page.getByLabel("Notes").fill(
    "Focus on lighting and cable cleanup as the hero detail.",
  );
  await page.getByRole("button", { name: "Capture idea" }).click();

  await expect(page.getByText(inboxTitle)).toBeVisible();
  await page.getByRole("button", { name: "Convert to card" }).click();
  await page.getByLabel("Card title").fill(cardTitle);
  await page.getByLabel("Format").selectOption("short");
  await page.getByLabel("Platform").selectOption("youtube");
  await page.getByRole("button", { name: "Create content card" }).click();

  await expect(page.getByRole("heading", { name: cardTitle })).toBeVisible();

  const cardPath = new URL(page.url()).pathname;
  const cardId = cardPath.split("/").pop();

  if (!cardId) {
    throw new Error("Expected card detail URL to include a card ID.");
  }

  await page.getByLabel("Hook").fill(
    "I thought I needed new gear. I needed three tiny desk fixes.",
  );
  await page.getByLabel("Script").fill(
    "Open on the messy desk, then walk through the three changes in order.",
  );
  await page.getByRole("button", { name: "Generate hooks" }).click();
  await expect(page.getByText("AI suggestions")).toBeVisible();

  await page.getByRole("button", { name: "Add A-roll item" }).click();
  await page.getByLabel("New A-roll item").fill("Intro line at desk");
  await page.getByRole("button", { name: "Save A-roll item" }).click();
  await page.getByLabel("Checklist Intro line at desk").check();

  await page.getByLabel("Asset title").fill("Lighting reference");
  await page.getByLabel("Asset URL").fill("https://example.com/lighting-reference");
  await page.getByRole("button", { name: "Attach asset" }).click();
  await page.getByRole("link", { name: "Open studio editor" }).click();
  await expect(page.getByText("Project Media")).toBeVisible();
  await page.getByRole("button", { name: "Back to card" }).click();

  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Board", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Production Board" }),
  ).toBeVisible();
  await page.locator(`[data-testid="card-status-select-${cardId}"]`).selectOption("posted");

  await page.goto(cardPath);
  await page.getByLabel("Views").fill("14500");
  await page.getByLabel("Likes").fill("1100");
  await page.getByLabel("Decision").selectOption("repeat");
  await page.getByLabel("Follow-up idea").fill(
    "Part two with the sound setup improvements",
  );
  await page.getByRole("button", { name: "Save analytics" }).click();

  await expect(page.getByText("Part two with the sound setup improvements")).toBeVisible();
});
