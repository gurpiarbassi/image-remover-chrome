/**
 * Test helper utilities for Chrome extension testing
 */

/**
 * Mock Chrome storage with a simple in-memory store
 */
class MockChromeStorage {
  constructor() {
    this.storage = new Map();
  }

  get(keys, callback) {
    const result = {};
    
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        if (this.storage.has(key)) {
          result[key] = this.storage.get(key);
        }
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        if (this.storage.has(key)) {
          result[key] = this.storage.get(key);
        } else {
          result[key] = keys[key]; // Default value
        }
      });
    } else if (typeof keys === 'string') {
      if (this.storage.has(keys)) {
        result[keys] = this.storage.get(keys);
      }
    } else if (keys === null) {
      // Return all stored values
      this.storage.forEach((value, key) => {
        result[key] = value;
      });
    }
    
    setTimeout(() => callback(result), 0);
  }

  set(data, callback) {
    Object.keys(data).forEach(key => {
      this.storage.set(key, data[key]);
    });
    
    if (callback) {
      setTimeout(callback, 0);
    }
  }

  remove(keys, callback) {
    if (Array.isArray(keys)) {
      keys.forEach(key => this.storage.delete(key));
    } else {
      this.storage.delete(keys);
    }
    
    if (callback) {
      setTimeout(callback, 0);
    }
  }

  clear(callback) {
    this.storage.clear();
    
    if (callback) {
      setTimeout(callback, 0);
    }
  }
}

/**
 * Create a mock DOM environment for testing
 */
function createMockDOM() {
  const mockImages = [
    { src: 'https://imagedelivery.net/image1.jpg', remove: jest.fn() },
    { src: 'https://imagedelivery.net/image2.png', remove: jest.fn() },
    { src: 'https://otherdomain.com/image3.jpg', remove: jest.fn() },
    { src: 'https://imagedelivery.net/image4.gif', remove: jest.fn() }
  ];

  return {
    images: mockImages,
    querySelectorAll: jest.fn((selector) => {
      if (selector.includes('imagedelivery.net')) {
        return mockImages.filter(img => img.src.includes('imagedelivery.net'));
      }
      return [];
    }),
    getElementById: jest.fn((id) => {
      const elements = {
        domain: { value: '', addEventListener: jest.fn() },
        save: { textContent: 'Save', addEventListener: jest.fn() },
        remove: { textContent: 'Remove Images', addEventListener: jest.fn() }
      };
      return elements[id] || null;
    }),
    addEventListener: jest.fn(),
    body: {
      innerHTML: ''
    }
  };
}

/**
 * Create a mock Chrome API environment
 */
function createMockChromeAPI() {
  const mockStorage = new MockChromeStorage();
  
  return {
    storage: {
      local: mockStorage
    },
    tabs: {
      query: jest.fn((queryInfo, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      })
    },
    scripting: {
      executeScript: jest.fn((options, callback) => {
        if (callback) callback();
      })
    },
    runtime: {
      onInstalled: {
        addListener: jest.fn()
      }
    }
  };
}

/**
 * Wait for a condition to be true
 */
function waitFor(condition, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
}

/**
 * Create a test HTML page with images
 */
function createTestPage(images) {
  const imageElements = images.map(img => 
    `<img src="${img.src}" alt="${img.alt || 'test'}" />`
  ).join('\n');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        ${imageElements}
      </body>
    </html>
  `;
}

/**
 * Validate domain format
 */
function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

/**
 * Count images by domain
 */
function countImagesByDomain(images, domain) {
  return images.filter(img => img.src.includes(domain)).length;
}

module.exports = {
  MockChromeStorage,
  createMockDOM,
  createMockChromeAPI,
  waitFor,
  createTestPage,
  isValidDomain,
  countImagesByDomain
}; 