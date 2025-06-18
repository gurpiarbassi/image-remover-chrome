// Mock Chrome extension APIs for testing
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    query: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  },
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    }
  }
};

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  chrome.storage.local.get.mockClear();
  chrome.storage.local.set.mockClear();
  chrome.tabs.query.mockClear();
  chrome.scripting.executeScript.mockClear();
  chrome.runtime.onInstalled.addListener.mockClear();
});
