// Harness probe for UI tasks: drives the REAL app (Next dev server + FastAPI) with Playwright.
// Usage: node scripts/probes/journey.mjs <search|results|choose|all>   (servers must be running; scripts/serve.sh starts them)
// Relies only on the UI contract in AGENTS.md (accessible names), not on implementation details.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../web/package.json", import.meta.url)); // resolve playwright from web/node_modules
const { chromium } = require("playwright");

const stage = process.argv[2] ?? "all";
const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const OUT = new URL("../../evidence/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const failures = [];
const check = (cond, msg) => { console.log(`  ${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) failures.push(msg); };
const run = (name) => stage === "all" || stage === name;

const browser = await chromium.launch();
async function fresh(width = 1280, height = 900) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  return page;
}
const field = (p) => p.getByLabel(/your request/i);
const scenario = (p) => p.getByLabel(/demo scenario/i);
const submit = (p) => p.getByRole("button", { name: /find hotels/i });
const list = (p) => p.getByRole("list", { name: /recommended hotels/i });
const visible = (loc, timeout = 5000) => loc.waitFor({ state: "visible", timeout }).then(() => true, () => false);

try {
  if (run("search")) {
    console.log("stage: search (request form, demo control, validation, loading)");
    const p = await fresh();
    check((await field(p).inputValue()).includes("Wellington"), "request field labelled 'Your request' and prefilled with the Wellington example");
    const options = await scenario(p).locator("option").evaluateAll((os) => os.map((o) => o.value));
    check(JSON.stringify(options) === JSON.stringify(["success", "empty", "error"]), "'Demo scenario' select offers success, empty, error");
    let requests = 0;
    p.on("request", (r) => { if (r.url().includes("/recommendations") && r.method() === "POST") requests++; });
    await field(p).fill("   ");
    await submit(p).click();
    check(await visible(p.getByText(/describe the hotel/i), 2000), "blank message shows inline error");
    check(requests === 0, "blank message sends no request");
    await field(p).fill("Find a Wellington hotel for two nights, up to NZD 250 per night; breakfast preferred.");
    await submit(p).click();
    check(await visible(p.getByRole("status").filter({ hasText: /finding hotels/i }), 2000), "progress shown in role=status while waiting");
    check(await p.getByRole("button", { name: /finding/i }).isDisabled().catch(() => false), "submit disabled while waiting");
    check(requests === 1, "one POST /recommendations sent");
    await p.screenshot({ path: OUT + "probe-search-loading.png", fullPage: true });
  }

  if (run("results")) {
    console.log("stage: results (cards, fixture label, empty, error + retry)");
    const p = await fresh();
    await submit(p).click();
    check(await visible(list(p)), "list 'Recommended hotels' appears");
    const items = list(p).getByRole("listitem");
    check((await items.count()) === 3, "three hotel cards");
    const text = await list(p).innerText();
    for (const s of ["Harbour House", "City Garden", "Quay Rooms", "NZD 220", "NZD 245", "NZD 195"]) check(text.includes(s), `cards show "${s}"`);
    check(/breakfast included/i.test(text) && /breakfast not included/i.test(text), "cards show breakfast included / not included");
    check(text.includes("Lower price; breakfast costs extra."), "cards show explanation");
    check(await visible(p.getByText(/fixture/i).first(), 1000), "response labelled as fixture data");
    await p.screenshot({ path: OUT + "probe-results.png", fullPage: true });

    await scenario(p).selectOption("empty");
    await submit(p).click();
    check(await visible(p.getByText(/no hotels to show/i)), "empty scenario shows 'No hotels to show'");
    check((await list(p).count()) === 0, "empty scenario shows no cards");
    await p.screenshot({ path: OUT + "probe-empty.png", fullPage: true });

    await scenario(p).selectOption("error");
    await submit(p).click();
    const alert = p.getByRole("alert").filter({ hasText: /unavailable|try again/i });
    check(await visible(alert), "error scenario shows role=alert with the API message");
    const retry = p.getByRole("button", { name: /retry/i });
    check(await visible(retry, 1000), "Retry button offered");
    await p.screenshot({ path: OUT + "probe-error.png", fullPage: true });
    await scenario(p).selectOption("success");
    await retry.click();
    check(await visible(list(p)), "Retry (scenario switched to success) recovers and shows cards");
    check((await alert.count()) === 0, "alert cleared after recovery"); // (Next.js adds its own empty role=alert route announcer, so filter by text)
  }

  if (run("choose")) {
    console.log("stage: choose (keyboard-only selection and summary)");
    const p = await fresh();
    await field(p).focus();
    // Keyboard only from here: Tab to the submit button and press Enter.
    for (let i = 0; i < 10 && !(await submit(p).evaluate((el) => el === document.activeElement)); i++) await p.keyboard.press("Tab");
    check(await submit(p).evaluate((el) => el === document.activeElement), "Find hotels reachable with Tab");
    await p.keyboard.press("Enter");
    check(await visible(list(p)), "Enter on Find hotels submits");
    const target = p.getByRole("button", { name: "Choose City Garden" });
    for (let i = 0; i < 20 && !(await target.evaluate((el) => el === document.activeElement)); i++) await p.keyboard.press("Tab");
    check(await target.evaluate((el) => el === document.activeElement), "'Choose City Garden' reachable with Tab");
    const outline = await target.evaluate((el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth);
    check(!outline.startsWith("none"), `focused Choose button has a visible outline (${outline})`);
    await p.keyboard.press("Enter");
    check((await target.getAttribute("aria-pressed")) === "true", "chosen button has aria-pressed=true");
    const summary = p.getByRole("region", { name: /your choice/i });
    check(await visible(summary, 2000), "summary region 'Your choice' shown");
    const st = await summary.innerText().catch(() => "");
    check(st.includes("City Garden") && st.includes("NZD 245"), "summary names the hotel and nightly price");
    check(await summary.evaluate((el) => el.contains(document.activeElement)).catch(() => false), "focus moved to the summary");
    await p.getByRole("button", { name: "Choose Quay Rooms" }).click();
    check((await p.getByRole("button", { name: /^choose /i, pressed: true }).count()) === 1, "exactly one hotel chosen at a time");
    check((await summary.innerText()).includes("Quay Rooms"), "summary follows a new choice");
    await p.screenshot({ path: OUT + "probe-chosen.png", fullPage: true });
  }

  if (stage === "all") {
    console.log("stage: small screen (360px)");
    const p = await fresh(360, 800);
    await submit(p).click();
    await visible(list(p));
    await p.getByRole("button", { name: "Choose Harbour House" }).click();
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `no horizontal overflow at 360px (overflow ${overflow}px)`);
    await p.screenshot({ path: OUT + "probe-mobile-360.png", fullPage: true });
  }
} finally {
  await browser.close();
}
console.log(`\n${failures.length} failure(s)`);
process.exit(failures.length ? 1 : 0);
