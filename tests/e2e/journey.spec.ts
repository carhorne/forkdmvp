import { expect, test } from "@playwright/test";
import { deleteTestRatings } from "./dev-harness";
import { BASE, expectPhoneFriendly, lastShare, sessionFor, signIn, stubShare, trackConsoleErrors } from "./helpers";

// Each run starts and ends without test-account ratings (development only; assumes no other ratings on Saag Paneer).
test.beforeEach(async () => { await deleteTestRatings(); });
test.afterEach(async () => { await deleteTestRatings(); });

// Q1 / P2 rehearsal: search → menu → filter/search/sort → dish → sign in → rate → edit → share,
// then a separate signed-out browser opens all three shared links.
test("full diner journey", async ({ browser, context, page }, info) => {
  const session = sessionFor(info);
  const phone = info.project.name === "phone";
  await stubShare(context);
  const errors = trackConsoleErrors(page);

  // Search the collection.
  await page.goto("/");
  await page.getByLabel("Find a restaurant").fill("bomb");
  await page.getByLabel("Find a restaurant").press("Enter");
  await expect(page.getByRole("status")).toContainText("1 location matching “bomb”");
  if (phone) await expectPhoneFriendly(page);
  await page.getByRole("link", { name: /Bombay House/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bombay House");
  const restaurantUrl = page.url();

  // Refine the menu: search, category, sort, clear.
  await page.getByLabel("Search this menu", { exact: true }).fill("masala");
  await page.getByLabel("Search this menu", { exact: true }).press("Enter");
  await expect(page.locator("p.count[role=status]")).toContainText("3 dishes match “masala”");
  await page.getByLabel("Category", { exact: true }).selectOption("Chicken Specialities");
  await expect(page).toHaveURL(/category=Chicken\+Specialities/);
  await expect(page.locator(".dish-name")).toHaveText(["Chicken Tikka Masala"]);
  await page.getByLabel("Sort", { exact: true }).selectOption("price");
  await expect(page).toHaveURL(/sort=price/);
  await page.getByRole("link", { name: "Clear search and filters" }).click();
  await expect(page).toHaveURL(restaurantUrl);
  await expect(page.locator(".dish")).toHaveCount(10);
  if (phone) await expectPhoneFriendly(page);

  // Open a dish; signed out, choose a score and go through sign-in.
  await page.getByRole("link", { name: /Saag Paneer/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Saag Paneer");
  const dishUrl = page.url().split("#")[0];
  await page.getByLabel("Score (1.0 to 10.0)").fill("8.4");
  await page.getByRole("button", { name: "Sign in to rate" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fdishes%2F/);
  const next = await page.locator("input[name=next]").inputValue();
  expect(next).toBe(`${new URL(dishUrl).pathname}#rate`);

  // Stand-in for the emailed code/link (real email is the owner's manual check).
  await signIn(context, session);
  await page.goto(next);
  await expect(page.getByLabel("Score (1.0 to 10.0)")).toHaveValue("8.4");
  await expect(page.getByText("We kept the score you chose before signing in")).toBeVisible();
  await expect(page.locator(".score-large")).toContainText("No ratings yet"); // nothing saved yet
  await page.getByRole("button", { name: "Save rating" }).click();
  await expect(page.getByText("Saved. Your rating: 8.4.")).toBeVisible();
  await expect(page.locator(".score-large")).toContainText("8.4");
  await expect(page.locator(".score-large")).toContainText("1 rating");

  // Edit: same rating, new score; aggregate follows.
  await page.getByLabel("Score (1.0 to 10.0)").fill("7.0");
  await page.getByRole("button", { name: "Update rating" }).click();
  await expect(page.getByText("Saved. Your rating: 7.0.")).toBeVisible();
  await expect(page.locator(".score-large")).toContainText("7.0");
  await expect(page.locator(".score-large")).toContainText("1 rating");
  if (phone) await expectPhoneFriendly(page);

  // Share all three targets.
  await page.getByRole("button", { name: "Share my rating (7.0)" }).click();
  const rating = await lastShare(page);
  expect(rating?.text).toBe("I rated Saag Paneer at Bombay House 7.0/10 on Forkd.");
  await page.getByRole("button", { name: "Share this dish" }).click();
  const dish = await lastShare(page);
  expect(dish?.text).toBe("Saag Paneer at Bombay House: 7.0/10 from 1 rating on Forkd.");
  expect(dish?.url).toBe(dishUrl);
  await page.goto(restaurantUrl);
  await page.getByRole("button", { name: "Share this restaurant" }).click();
  const restaurant = await lastShare(page);
  expect(restaurant?.url).toBe(restaurantUrl.split("?")[0]);
  await expect(page.locator(".dish").first()).toContainText("Saag Paneer"); // now top rated

  // A separate signed-out browser opens every shared link.
  const stranger = await browser.newContext();
  const view = await stranger.newPage();
  for (const [shared, heading] of [[restaurant, "Bombay House"], [dish, "Saag Paneer"], [rating, "Saag Paneer"]] as const) {
    const response = await view.goto(shared!.url!.replace("http://localhost:3000", BASE));
    expect(response?.status()).toBe(200);
    await expect(view.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
  await expect(view.locator(".hero")).toContainText(/an individual rating/i);
  await expect(view.locator(".score-value")).toHaveText("7.0");
  await stranger.close();

  // Sign out.
  await page.goto("/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  expect(errors).toEqual([]);
});
