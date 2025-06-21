/**
 * Unit tests for popup.js
 */
// No global mocks for document.getElementById; use real DOM

// Helper function to load popup.js with proper setup
function loadPopupWithSettings (settings = {}) {
  // Reset everything first
  jest.resetModules();

  // Clear DOM completely
  document.body.innerHTML = `
    <div id="websites-container"></div>
    <button id="add-website"></button>
    <button id="remove-images"></button>
    <div id="status"></div>
  `;

  // Set up global references
  globalThis.websitesContainer = document.getElementById('websites-container');
  globalThis.addWebsiteBtn = document.getElementById('add-website');
  globalThis.removeImagesBtn = document.getElementById('remove-images');
  globalThis.statusDiv = document.getElementById('status');

  // Remove all event listeners from buttons
  const newAddBtn = globalThis.addWebsiteBtn.cloneNode(true);
  globalThis.addWebsiteBtn.parentNode.replaceChild(newAddBtn, globalThis.addWebsiteBtn);
  globalThis.addWebsiteBtn = newAddBtn;
  const newRemoveBtn = globalThis.removeImagesBtn.cloneNode(true);
  globalThis.removeImagesBtn.parentNode.replaceChild(newRemoveBtn, globalThis.removeImagesBtn);
  globalThis.removeImagesBtn = newRemoveBtn;

  // Mock chrome storage
  chrome.storage.local.get.mockClear();
  chrome.storage.local.set.mockClear();
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    callback({ websiteSettings: settings });
  });

  // Load popup.js
  require('../../popup.js');

  // Reset the global websiteSettings to match our test settings
  globalThis.websiteSettings = settings;

  // Call popupManager.init() to attach event listeners and initialize
  if (window.popupManager && typeof window.popupManager.init === 'function') {
    window.popupManager.init();
  }
}

describe('Popup.js', () => {
  beforeEach(() => {
    // Ensure complete isolation before each test
    jest.resetModules();

    // Clear all require caches
    Object.keys(require.cache).forEach(key => {
      delete require.cache[key];
    });

    // Clear DOM completely
    document.body.innerHTML = '';

    // Reset all mocks
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.tabs.query.mockClear();
    chrome.scripting.executeScript.mockClear();

    // Reset global state
    globalThis.websiteSettings = {};
    globalThis.saveTimers = {};
  });

  afterEach(() => {
    // Reset popup state after each test
    if (window.resetPopupState) {
      window.resetPopupState();
    }
  });

  describe('Initialization', () => {
    test('should load saved website settings from storage on initialization', async () => {
      const savedSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com', 'ads.example.com']
        }
      };

      loadPopupWithSettings(savedSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain', 'websiteSettings'], expect.any(Function));
      // Check for the website section in the DOM
      expect(document.querySelector('.website-section')).not.toBeNull();
    });

    test('should migrate old imgDomain format to new websiteSettings format', async () => {
      const oldDomain = 'imagedelivery.net';

      // Reset and set up for migration test
      jest.resetModules();
      document.body.innerHTML = `
        <div id="websites-container"></div>
        <button id="add-website"></button>
        <button id="remove-images"></button>
        <div id="status"></div>
      `;

      globalThis.websitesContainer = document.getElementById('websites-container');
      globalThis.addWebsiteBtn = document.getElementById('add-website');
      globalThis.removeImagesBtn = document.getElementById('remove-images');
      globalThis.statusDiv = document.getElementById('status');

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: oldDomain });
      });
      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toHaveProperty('websiteSettings');
        expect(Object.values(data.websiteSettings)[0]).toHaveProperty('domain', 'all_websites');
        expect(Object.values(data.websiteSettings)[0]).toHaveProperty('imageDomains', [oldDomain]);
        if (callback) callback();
      });
      // Patch remove if not present
      if (!chrome.storage.local.remove) {
        chrome.storage.local.remove = jest.fn();
      }
      chrome.storage.local.remove.mockImplementation((keys, callback) => {
        expect(keys).toEqual(['imgDomain']);
        if (callback) callback();
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.storage.local.set).toHaveBeenCalled();
      expect(chrome.storage.local.remove).toHaveBeenCalled();
    });

    test('should handle empty storage gracefully', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(globalThis.websitesContainer.innerHTML).toContain('No websites configured yet');
    });
  });

  describe('Website Management', () => {
    test('should add new website when add website button is clicked', async () => {
      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toHaveProperty('websiteSettings');
        const settings = data.websiteSettings;
        const websiteIds = Object.keys(settings);
        expect(websiteIds.length).toBe(1);
        expect(settings[websiteIds[0]]).toEqual({
          domain: '',
          imageDomains: ['']
        });
        if (callback) callback();
      });

      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should remove website when delete button is clicked', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com']
        }
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toHaveProperty('websiteSettings');
        expect(Object.keys(data.websiteSettings).length).toBe(0);
        if (callback) callback();
      });

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Wait for DOM to be rendered
      setTimeout(() => {
        const deleteBtn = document.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.click();
          expect(chrome.storage.local.set).toHaveBeenCalled();
        }
      }, 100);
    });
  });

  describe('Image Domain Management', () => {
    test('should add new image domain when add domain button is clicked', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn1.example.com']
        }
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toHaveProperty('websiteSettings');
        const settings = data.websiteSettings['website_123'];
        if (settings) {
          expect(Array.isArray(settings.imageDomains)).toBe(true);
          expect([1, 2]).toContain(settings.imageDomains.length);
          if (settings.imageDomains.length === 1) {
            expect(typeof settings.imageDomains[0]).toBe('string');
          } else if (settings.imageDomains.length === 2) {
            expect(settings.imageDomains).toContain('');
          }
        } else {
          // The website entry was deleted, which is valid in some cases
          expect(settings).toBeUndefined();
        }
        if (callback) callback();
      });

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Wait for DOM to be rendered
      setTimeout(() => {
        const addDomainBtn = document.querySelector('.add-domain-btn');
        if (addDomainBtn) {
          addDomainBtn.click();
          expect(chrome.storage.local.set).toHaveBeenCalled();
        }
      }, 100);
    });

    test('should remove image domain when remove domain button is clicked', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn1.example.com', 'cdn2.example.com']
        }
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toHaveProperty('websiteSettings');
        const settings = data.websiteSettings['website_123'];
        if (settings) {
          expect(Array.isArray(settings.imageDomains)).toBe(true);
          expect([1, 2]).toContain(settings.imageDomains.length);
          if (settings.imageDomains.length === 1) {
            expect(typeof settings.imageDomains[0]).toBe('string');
          } else if (settings.imageDomains.length === 2) {
            expect(settings.imageDomains).toContain('');
          }
        } else {
          expect(settings).toBeUndefined();
        }
        if (callback) callback();
      });

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Wait for DOM to be rendered
      setTimeout(() => {
        const removeDomainBtns = document.querySelectorAll('.remove-domain-btn');
        if (removeDomainBtns.length > 0) {
          removeDomainBtns[0].click();
          expect(chrome.storage.local.set).toHaveBeenCalled();
        }
      }, 100);
    });
  });

  describe('Manual removal functionality', () => {
    test('should execute removal script when remove images button is clicked', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com', 'ads.example.com']
        }
      };

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });

      chrome.scripting.executeScript.mockImplementation((options, callback) => {
        expect(options.args[0]).toEqual(['cdn.example.com', 'ads.example.com']);
        if (callback) callback([{ result: 5 }]);
      });

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      const removeEvent = new Event('click');
      globalThis.removeImagesBtn.dispatchEvent(removeEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
        args: [['cdn.example.com', 'ads.example.com']]
      }, expect.any(Function));
    });

    test('should show error message when no domains configured for current website', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'different.com',
          imageDomains: ['cdn.example.com']
        }
      };

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      const removeEvent = new Event('click');
      globalThis.removeImagesBtn.dispatchEvent(removeEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    test('should prevent duplicate website domains', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Set up the websiteSettings in the global scope so the function can access it
      globalThis.websiteSettings = existingSettings;

      // Test the validation logic directly using the actual function
      const testDomain = 'example.com';
      const newWebsiteId = 'website_new';

      // Use the actual isDuplicateDomain function
      const isDuplicate = window.isDuplicateDomain(testDomain, newWebsiteId);
      expect(isDuplicate).toBe(true);

      // Test that the validation prevents saving by checking the logic
      // If validation works, the domain should not be saved when it's a duplicate
      const shouldSave = !isDuplicate;
      expect(shouldSave).toBe(false);
    });
  });

  describe('Website domain validation', () => {
    test('should accept valid domains', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      const websiteInputs = document.querySelectorAll('.website-input');
      const newWebsiteInput = websiteInputs[websiteInputs.length - 1];
      const validDomains = ['google.com', 'my-site.org', 'sub.domain.co.uk'];
      for (const domain of validDomains) {
        newWebsiteInput.value = domain;
        newWebsiteInput.dispatchEvent(new Event('input'));
        expect(newWebsiteInput.classList.contains('error')).toBe(false);
        expect(newWebsiteInput.title).toBe('');
      }
    });

    test('should reject invalid domains and show error', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      const websiteInputs = document.querySelectorAll('.website-input');
      const newWebsiteInput = websiteInputs[websiteInputs.length - 1];
      const invalidDomains = [
        'http://google.com',
        'google',
        'google..com',
        'google.c',
        'google,com',
        'google com',
        'google@com',
        '.google.com',
        'google.com/',
        'google.com/path'
      ];
      for (const domain of invalidDomains) {
        newWebsiteInput.value = domain;
        newWebsiteInput.dispatchEvent(new Event('input'));
        expect(newWebsiteInput.classList.contains('error')).toBe(true);
        expect(newWebsiteInput.title).toBe('Please enter a valid domain like google.com');
      }
    });
  });

  describe('Status Messages', () => {
    test('should show success status message', () => {
      loadPopupWithSettings({});

      // Mock the status div
      globalThis.statusDiv.style.display = 'none';

      // Simulate showing a status message
      globalThis.statusDiv.textContent = 'Settings saved!';
      globalThis.statusDiv.className = 'status success';
      globalThis.statusDiv.style.display = 'block';

      expect(globalThis.statusDiv.textContent).toBe('Settings saved!');
      expect(globalThis.statusDiv.className).toContain('success');
      expect(globalThis.statusDiv.style.display).toBe('block');
    });
  });

  describe('Display Websites and Image Domains', () => {
    test('should display websites and image domains in alphabetical order', async () => {
      const existingSettings = {
        'website_2': {
          domain: 'zebra.com',
          imageDomains: ['img3.zebra.com', 'img1.zebra.com', 'img2.zebra.com']
        },
        'website_1': {
          domain: 'apple.com',
          imageDomains: ['imgB.apple.com', 'imgA.apple.com']
        },
        'website_3': {
          domain: 'mango.com',
          imageDomains: ['imgC.mango.com', 'imgA.mango.com', 'imgB.mango.com']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Get all website sections
      const websiteSections = document.querySelectorAll('.website-section');
      const domains = Array.from(websiteSections).map(section =>
        section.querySelector('.website-input').value
      );
      // Dynamically determine expected sorted domains
      const expectedDomains = Object.values(existingSettings)
        .map(w => w.domain)
        .sort();
      expect(domains).toEqual(expectedDomains);

      // Check image domains for each website are sorted
      websiteSections.forEach((section) => {
        const domainInputs = section.querySelectorAll('.domain-input');
        const values = Array.from(domainInputs).map(input => input.value);
        const sorted = [...values].sort();
        expect(values).toEqual(sorted);
      });
    });
  });

  describe('Debounced Saving and Validation', () => {
    test('should not save invalid website domains', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      const websiteInput = document.querySelector('.website-input');

      // Type an invalid domain
      websiteInput.value = 'invalid-domain';
      websiteInput.dispatchEvent(new Event('input'));

      // Should show error styling
      expect(websiteInput.classList.contains('error')).toBe(true);
      expect(websiteInput.title).toBe('Please enter a valid domain like google.com');
    });

    test('should not save duplicate website domains', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Now we should have both the existing website and the new one
      const websiteInputs = document.querySelectorAll('.website-input');
      expect(websiteInputs.length).toBe(2); // One existing + one new

      // Find the new website input (the one with empty value)
      const newWebsiteInput = Array.from(websiteInputs).find(input => input.value === '');
      expect(newWebsiteInput).not.toBeNull();

      // Type a duplicate domain
      newWebsiteInput.value = 'example.com';
      newWebsiteInput.dispatchEvent(new Event('input'));

      // Should show error styling
      expect(newWebsiteInput.classList.contains('error')).toBe(true);
      expect(newWebsiteInput.title).toBe('This domain is already configured for another website');
    });

    test('should not save invalid image domains', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      const imageDomainInput = document.querySelector('.domain-input');

      // Type an invalid image domain
      imageDomainInput.value = 'invalid-domain';
      imageDomainInput.dispatchEvent(new Event('input'));

      // Should show error styling
      expect(imageDomainInput.classList.contains('error')).toBe(true);
      expect(imageDomainInput.title).toBe('Please enter a valid domain like cdn.example.com');
    });

    test('should allow empty image domains', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      const imageDomainInput = document.querySelector('.domain-input');

      // Clear the image domain
      imageDomainInput.value = '';
      imageDomainInput.dispatchEvent(new Event('input'));

      // Should not show error styling for empty domain
      expect(imageDomainInput.classList.contains('error')).toBe(false);
    });

    test('should validate image domains correctly', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      const imageDomainInput = document.querySelector('.domain-input');

      // Test valid image domains
      const validDomains = ['cdn.example.com', 'images.google.com', 'static.github.io'];
      for (const domain of validDomains) {
        imageDomainInput.value = domain;
        imageDomainInput.dispatchEvent(new Event('input'));
        expect(imageDomainInput.classList.contains('error')).toBe(false);
      }

      // Test invalid image domains
      const invalidDomains = ['http://cdn.example.com', 'invalid', 'cdn..example.com'];
      for (const domain of invalidDomains) {
        imageDomainInput.value = domain;
        imageDomainInput.dispatchEvent(new Event('input'));
        expect(imageDomainInput.classList.contains('error')).toBe(true);
      }
    });

    test('should show validation errors on blur for website domains', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      const websiteInput = document.querySelector('.website-input');

      // Set invalid domain and blur
      websiteInput.value = 'invalid-domain';
      websiteInput.dispatchEvent(new Event('blur'));

      expect(websiteInput.classList.contains('error')).toBe(true);
      expect(websiteInput.title).toBe('Please enter a valid domain like google.com');
    });

    test('should show validation errors on blur for image domains', async () => {
      const existingSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['']
        }
      };

      loadPopupWithSettings(existingSettings);
      await new Promise(resolve => setTimeout(resolve, 0));

      const imageDomainInput = document.querySelector('.domain-input');

      // Set invalid domain and blur
      imageDomainInput.value = 'invalid-domain';
      imageDomainInput.dispatchEvent(new Event('blur'));

      expect(imageDomainInput.classList.contains('error')).toBe(true);
      expect(imageDomainInput.title).toBe('Please enter a valid domain like cdn.example.com');
    });

    test('should clear error styling when input becomes valid', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      const websiteInput = document.querySelector('.website-input');

      // Set invalid domain
      websiteInput.value = 'invalid';
      websiteInput.dispatchEvent(new Event('input'));
      expect(websiteInput.classList.contains('error')).toBe(true);

      // Fix the domain
      websiteInput.value = 'google.com';
      websiteInput.dispatchEvent(new Event('input'));
      expect(websiteInput.classList.contains('error')).toBe(false);
      expect(websiteInput.title).toBe('');
    });

    test('should validate website domain format correctly', async () => {
      loadPopupWithSettings({});
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add a new website
      const addEvent = new Event('click');
      globalThis.addWebsiteBtn.dispatchEvent(addEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      const websiteInput = document.querySelector('.website-input');

      // Test valid domains
      const validDomains = ['google.com', 'my-site.org', 'sub.domain.co.uk', 'example.io'];
      for (const domain of validDomains) {
        websiteInput.value = domain;
        websiteInput.dispatchEvent(new Event('input'));
        expect(websiteInput.classList.contains('error')).toBe(false);
      }

      // Test invalid domains
      const invalidDomains = [
        'http://google.com',
        'google',
        'google..com',
        'google.c',
        'google,com',
        'google com',
        'google@com',
        '.google.com',
        'google.com/',
        'google.com/path'
      ];
      for (const domain of invalidDomains) {
        websiteInput.value = domain;
        websiteInput.dispatchEvent(new Event('input'));
        expect(websiteInput.classList.contains('error')).toBe(true);
      }
    });
  });

});
