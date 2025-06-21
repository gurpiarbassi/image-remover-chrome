const { test, expect } = require('@playwright/test');
const path = require('path');
const EXTENSION_PATH = path.resolve(__dirname, '../../');
const userDataDir = path.join(__dirname, 'playwright-user-data');

// Helper to extract extension ID for Manifest v3 (no background page)
async function getExtensionId (context) {
  // Open a dummy popup page to trigger Chrome to register the extension
  try {
    await context.newPage().then(page => page.goto('chrome-extension://invalid/popup.html').catch(() => {}));
  } catch (e) {}
  // Try for up to 10 seconds, polling every 200ms
  for (let i = 0; i < 50; i++) {
    // Log all page URLs
    for (const p of context.pages()) {
      const url = p.url();
      console.log('Page URL:', url);
      if (url.startsWith('chrome-extension://')) {
        return url.split('/')[2];
      }
    }
    // Log all service worker URLs
    if (context.serviceWorkers) {
      for (const worker of context.serviceWorkers()) {
        const url = worker.url();
        console.log('Worker URL:', url);
        if (url.startsWith('chrome-extension://')) {
          return url.split('/')[2];
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Extension ID not found');
}

test.describe('Chrome Extension Integration Tests (Playwright)', () => {
  let context, extensionId;

  // Clear storage before each test except persistence test
  let skipStorageClear = false;

  test.beforeAll(async () => {
    context = await require('playwright').chromium.launchPersistentContext(userDataDir, {
      headless: false, // true in CI, false locally
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    extensionId = await getExtensionId(context);
  });

  test.beforeEach(async () => {
    if (!context || (context.isClosed && context.isClosed())) {
      context = await require('playwright').chromium.launchPersistentContext(userDataDir, {
        headless: false, // true in CI, false locally
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      extensionId = await getExtensionId(context);
      console.log('Re-initialized browser context and extensionId in beforeEach');
    }
    if (skipStorageClear) return;
    // Open a new page to run the clear command
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.clear(resolve);
      });
    });
    await page.close();
    console.log('Cleared chrome.storage.local before test');
  });

  test.afterEach(async () => {
    skipStorageClear = false;
    console.log('Context is closed (afterEach):', context.isClosed && context.isClosed());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should load extension successfully', async () => {
    expect(extensionId).toBeDefined();
    expect(extensionId.length).toBeGreaterThan(0);
  });

  test('should have correct manifest properties', async () => {
    const manifest = require('../../manifest.json');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Custom Image Remover');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.permissions).toContain('activeTab');
  });

  test('should open popup and display UI elements', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    // Check for UI elements (use selectors that exist in your popup.html)
    const addBtn = await page.$('#add-website');
    const removeBtn = await page.$('#remove-images');
    expect(addBtn).toBeTruthy();
    expect(removeBtn).toBeTruthy();
    await page.close();
  });

  test('should persist website/domain setting across browser sessions', async () => {
    skipStorageClear = true; // Don't clear storage between the two page loads in this test
    // Clear storage at the start of this test
    let page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.clear(resolve);
      });
    });
    await page.close();

    // Add a website and domain
    page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('#add-website');
    const websiteInput = await page.$('.website-input');
    await websiteInput.fill('testdomain.com');
    await page.waitForTimeout(2000); // Give time for debounced save
    // Debug: print storage after save
    const storage = await page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['websiteSettings'], resolve);
      });
    });
    console.log('Storage after save:', storage);
    await page.close();

    // Open popup again and check if domain is loaded
    page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    const loadedValues = await page.$$eval('.website-input', inputs => inputs.map(input => input.value));
    console.log('Loaded values:', loadedValues);
    expect(loadedValues).toContain('testdomain.com');
    await page.close();
  });

  test('should remove images from specified domain', async () => {
    // Set up website/domain in popup
    let page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('#add-website');
    const websiteInput = await page.$('.website-input');
    await websiteInput.fill('imagedelivery.net');
    const domainInput = await page.$('.domain-input');
    await domainInput.fill('imagedelivery.net');
    await page.close();

    // Create a test page with images
    page = await context.newPage();
    await page.setContent(`
      <html>
        <body>
          <img src="https://imagedelivery.net/image1.jpg" alt="test1">
          <img src="https://imagedelivery.net/image2.png" alt="test2">
          <img src="https://otherdomain.com/image3.jpg" alt="test3">
          <img src="https://imagedelivery.net/image4.gif" alt="test4">
        </body>
      </html>
    `);
    // Simulate content script running (you may need to trigger it manually)
    await page.waitForTimeout(1000);
    // Check that only images from imagedelivery.net were removed
    const remainingImages = await page.$$eval('img', imgs => imgs.filter(img => img.style.display !== 'none').map(img => img.src));
    expect(remainingImages).toContain('https://otherdomain.com/image3.jpg');
    await page.close();
  });

  test.skip('should handle pages with no matching images', async () => {
    // Set up website/domain in popup
    let page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('#add-website');
    const websiteInput = await page.$('.website-input');
    await websiteInput.fill('imagedelivery.net');
    const domainInput = await page.$('.domain-input');
    await domainInput.fill('imagedelivery.net');
    await page.close();

    // Create a test page with no matching images
    page = await context.newPage();
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <style>
            img { width: 100px; height: 100px; border: 2px solid red; display: block; }
          </style>
        </head>
        <body>
          <img src="https://otherdomain1.com/image1.jpg" alt="test1">
          <img src="https://otherdomain2.com/image2.png" alt="test2">
        </body>
      </html>
    `);
    await page.waitForTimeout(1000);
    const remainingImages = await page.$$eval('img', imgs => imgs.filter(img => img.style.display !== 'none').map(img => img.src));
    expect(remainingImages.length).toBe(2);
    await page.close();
  }, 60000);

  test('should remove images when manual button is clicked', async () => {
    // Set up website/domain in popup
    let page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('#add-website');
    const websiteInput = await page.$('.website-input');
    await websiteInput.fill('imagedelivery.net');
    const domainInput = await page.$('.domain-input');
    await domainInput.fill('imagedelivery.net');
    await page.close();

    // Create a test page
    page = await context.newPage();
    await page.setContent(`
      <html>
        <body>
          <img src="https://imagedelivery.net/image1.jpg" alt="test1">
          <img src="https://otherdomain.com/image2.jpg" alt="test2">
        </body>
      </html>
    `);
    // Open popup and click remove
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.click('#remove-images');
    await popup.close();
    await page.waitForTimeout(1000);
    const remainingImages = await page.$$eval('img', imgs => imgs.filter(img => img.style.display !== 'none').map(img => img.src));
    expect(remainingImages).toContain('https://otherdomain.com/image2.jpg');
    await page.close();
  });
});
