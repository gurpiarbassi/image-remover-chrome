// Mock Chrome extension APIs for testing
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
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
    },
    onStartup: {
      addListener: jest.fn()
    }
  }
};

// Force all console.log and console.error to print immediately, even for passing tests
global.console.log = (...args) => {
  process.stdout.write(args.join(' ') + '\n');
};
global.console.error = (...args) => {
  process.stderr.write(args.join(' ') + '\n');
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
