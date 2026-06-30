const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/audit-mobile.png", fullPage: true });
  console.log("Mobile screenshot: /tmp/audit-mobile.png");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/audit-desktop.png", fullPage: true });
  console.log("Desktop screenshot: /tmp/audit-desktop.png");

  await browser.close();
}
run().catch(console.error);
