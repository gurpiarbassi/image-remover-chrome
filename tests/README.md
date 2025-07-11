# Testing Guide for Custom Image Remover Chrome Extension

This document explains how to run and write tests for the Chrome extension.

## 🧪 Test Structure

```
tests/
├── setup.js              # Jest setup and Chrome API mocks
├── unit/                 # Unit tests for individual components
│   ├── popup.test.js     # Tests for popup functionality
│   ├── content.test.js   # Tests for content script
│   └── background.test.js # Tests for background script
├── integration/          # Integration tests using Puppeteer
│   └── extension.test.js # End-to-end extension tests
└── utils/               # Test utilities and helpers
    └── test-helpers.js  # Common test functions
```

## 🚀 Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Run Linting
```bash
npm run lint
npm run lint:fix
```

## 📝 Writing Tests

### Unit Tests

Unit tests focus on testing individual functions and components in isolation. They use mocked Chrome APIs and DOM elements.

#### Example Unit Test Structure:
```javascript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup mocks and test environment
  });

  test('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

#### Testing Chrome APIs:
```javascript
// Mock Chrome storage
chrome.storage.local.get.mockImplementation((keys, callback) => {
  callback({ imgDomain: 'test.com' });
});

// Verify API calls
expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain'], expect.any(Function));
```

### Integration Tests

Integration tests use Playwright to test the extension in a real browser environment. They verify that all components work together correctly.

#### Key Integration Test Features:
- **Real Browser**: Tests run in actual Chrome browser
- **Extension Loading**: Extension is loaded as it would be for users
- **DOM Manipulation**: Tests real DOM changes and image removal
- **Storage Persistence**: Verifies data persists across sessions

#### Example Integration Test:
```javascript
test('should remove images from specified domain', async () => {
  // Setup: Configure extension
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.type('#domain', 'imagedelivery.net');
  await page.click('#save');
  
  // Test: Create page with images
  await page.setContent(`
    <img src="https://imagedelivery.net/image1.jpg">
    <img src="https://otherdomain.com/image2.jpg">
  `);
  
  // Verify: Check results
  const remainingImages = await page.$$eval('img', imgs => imgs.map(img => img.src));
  expect(remainingImages).toHaveLength(1);
});
```

## 🛠 Test Utilities

### MockChromeStorage
In-memory storage mock that mimics Chrome's storage API:
```javascript
const { MockChromeStorage } = require('./utils/test-helpers');
const storage = new MockChromeStorage();
```

### createMockDOM
Creates a mock DOM environment for testing:
```javascript
const { createMockDOM } = require('./utils/test-helpers');
const dom = createMockDOM();
```

### waitFor
Utility for waiting for asynchronous conditions:
```javascript
const { waitFor } = require('./utils/test-helpers');
await waitFor(() => document.querySelectorAll('img').length === 0);
```

## 🔧 Test Configuration

### Jest Configuration (package.json)
- **Environment**: jsdom for unit tests
- **Coverage**: Collects coverage from all .js files except tests
- **Setup**: Automatically loads setup.js before tests
- **Pattern**: Runs tests in tests/ directory

### ESLint Configuration
- **Rules**: Standard JavaScript rules
- **Environment**: Browser, Node, Jest
- **Globals**: Chrome API available

## 📊 Coverage Reports

After running `npm run test:coverage`, you'll get:
- **Console Output**: Summary of coverage
- **HTML Report**: Detailed coverage in `coverage/` directory
- **LCOV Report**: For CI/CD integration

## 🐛 Debugging Tests

### Unit Tests
```bash
# Run specific test file
npm test -- popup.test.js

# Run with verbose output
npm test -- --verbose

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Integration Tests
```bash
# Run with visible browser
# (Set headless: false in integration test)

# Debug with slow motion
await page.setDefaultTimeout(10000);
```

## 🚨 Common Issues

### Chrome API Mocks
If tests fail due to Chrome API issues:
1. Check that `tests/setup.js` is properly mocking the required APIs
2. Ensure mocks are reset in `beforeEach`
3. Verify callback functions are called asynchronously

### Playwright Issues
If integration tests fail:
1. Ensure Chrome is installed and accessible
2. Check that extension path is correct
3. Verify extension ID is properly extracted

### DOM Issues
If DOM-related tests fail:
1. Check that jsdom environment is properly configured
2. Ensure DOM elements are created before testing
3. Verify event listeners are properly mocked

## 📈 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't rely on external services
3. **Clear Test Names**: Use descriptive test names
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Coverage**: Aim for high test coverage
6. **Performance**: Keep tests fast and efficient

## 🔄 Continuous Integration

For CI/CD, consider:
- Running tests in headless mode
- Using specific Chrome versions
- Setting up coverage reporting
- Adding linting checks
- Automated deployment on test success 