const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <img src="https://otherdomain1.com/image1.jpg">
        <img src="https://otherdomain2.com/image2.png">
      </body>
    </html>
  `);
  console.log('setContent worked!');
  await browser.close();
})();
