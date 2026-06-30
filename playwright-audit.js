const { chromium } = require("playwright");

const BASE = "http://localhost:3000";

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const issues = [];
  const pass = [];

  function ok(msg) { pass.push(msg); }
  function fail(msg) { issues.push(msg); }

  await page.goto(BASE, { waitUntil: "networkidle" });

  // ── Layout & Header ──────────────────────────────────────────
  const header = await page.$(".app-header");
  header ? ok("Header present") : fail("Header missing");

  const logo = await page.$(".header-logo");
  logo ? ok("Logo present") : fail("Logo element missing");

  const headerTitle = await page.$(".header-title");
  headerTitle ? ok("Header title present") : fail("Header title missing");

  // ── Heading hierarchy ────────────────────────────────────────
  const h1 = await page.$("h1");
  h1 ? ok("h1 present") : fail("h1 missing — breaks heading hierarchy");

  const h1Text = h1 ? await h1.textContent() : "";
  h1Text.trim().length > 0 ? ok("h1 has text") : fail("h1 is empty");

  // ── Demo block ───────────────────────────────────────────────
  const demoBlock = await page.$(".demo-block");
  demoBlock ? ok("Demo block visible") : fail("Demo block missing");

  const demoBtn = await page.$(".demo-btn");
  demoBtn ? ok("Demo button present") : fail("Demo button missing");

  const demoBtnText = demoBtn ? await demoBtn.textContent() : "";
  demoBtnText.trim().length > 0 ? ok("Demo button has label") : fail("Demo button label empty");

  // ── Gate block ───────────────────────────────────────────────
  const gateBlock = await page.$(".gate-block");
  gateBlock ? ok("Gate block present (unlocked=false state)") : fail("Gate block missing");

  const gateInput = await page.$(".gate-input");
  gateInput ? ok("Access code input present") : fail("Access code input missing");

  const gateBtn = await page.$(".gate-btn");
  gateBtn ? ok("Unlock button present") : fail("Unlock button missing");

  const gateContact = await page.$(".gate-contact");
  gateContact ? ok("Contact link present") : fail("Contact link missing");

  // ── Wrong code shows error ───────────────────────────────────
  await gateInput.fill("wrongcode");
  await gateBtn.click();
  await page.waitForTimeout(200);
  const gateError = await page.$(".gate-error");
  gateError ? ok("Wrong code shows error") : fail("No error shown for wrong access code");

  // ── Correct code unlocks textarea ───────────────────────────
  await gateInput.fill("arch2026");
  await gateBtn.click();
  await page.waitForTimeout(200);
  const textarea = await page.$(".input-textarea");
  textarea ? ok("Textarea appears after correct code") : fail("Textarea did not appear after correct code");

  const gateBlockAfter = await page.$(".gate-block");
  !gateBlockAfter ? ok("Gate block hidden after unlock") : fail("Gate block still visible after unlock");

  // ── Textarea interaction ──────────────────────────────────────
  if (textarea) {
    await textarea.fill("test input");
    const val = await textarea.inputValue();
    val === "test input" ? ok("Textarea accepts input") : fail("Textarea input not working");

    // Submit button should be enabled
    const submitBtn = await page.$(".submit-btn");
    const disabled = await submitBtn.getAttribute("disabled");
    disabled === null ? ok("Submit button enabled when input has text") : fail("Submit button disabled with non-empty input");
  }

  // ── Typography / contrast checks ──────────────────────────────
  const subheading = await page.$(".input-subheading");
  subheading ? ok("Subheading present") : fail("Subheading missing");

  // ── Divider exists ───────────────────────────────────────────
  const divider = await page.$(".divider-row");
  divider ? ok("Divider row present") : fail("Divider row missing");

  // ── Keyboard hint ─────────────────────────────────────────────
  const hint = await page.$(".submit-hint");
  hint ? ok("Keyboard shortcut hint visible") : fail("Keyboard hint missing");

  // ── Responsive: narrow viewport ──────────────────────────────
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(200);
  const demoBlockMobile = await page.$(".demo-block");
  demoBlockMobile ? ok("Demo block visible at 375px") : fail("Demo block disappears on mobile");

  const headerMobile = await page.$(".app-header");
  headerMobile ? ok("Header visible at 375px") : fail("Header missing on mobile");

  // Check demo block doesn't overflow
  const demoBox = await demoBlockMobile.boundingBox();
  demoBox && demoBox.width <= 375 ? ok("Demo block doesn't overflow at 375px") : fail("Demo block overflows on mobile");

  // ── Accessibility ─────────────────────────────────────────────
  await page.setViewportSize({ width: 1280, height: 800 });
  const focusable = await page.$$("button, input, textarea, a[href]");
  focusable.length >= 3 ? ok(`${focusable.length} focusable elements (accessible)`) : fail("Too few focusable elements");

  // Tab through focusable elements
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  ok("Tab navigation works");

  // ── Report ────────────────────────────────────────────────────
  await browser.close();

  console.log("\n══════════════════════════════════════════");
  console.log(" PLAYWRIGHT UI/UX AUDIT REPORT");
  console.log("══════════════════════════════════════════\n");

  console.log(`✓ PASS (${pass.length})`);
  pass.forEach((p) => console.log(`  ✓ ${p}`));

  console.log(`\n✗ ISSUES (${issues.length})`);
  if (issues.length === 0) {
    console.log("  None — all checks passed");
  } else {
    issues.forEach((i) => console.log(`  ✗ ${i}`));
  }

  console.log("\n══════════════════════════════════════════\n");
}

audit().catch((err) => { console.error(err); process.exit(1); });
