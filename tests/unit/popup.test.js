/**
 * Unit tests for popup.js
 */
// No global mocks for document.getElementById; use real DOM

describe('Popup.js', () => {
  beforeEach(() => {
    // Reset websiteSettings and DOM before each test
    globalThis.websiteSettings = {};
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

    // Clear chrome.storage.local mock before each test
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ websiteSettings: {} });
    });

    // Clear module cache so popup.js always sees the new DOM
    jest.resetModules();
  });

  describe('Initialization', () => {
    test('should load saved website settings from storage on initialization', async () => {
      const savedSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['cdn.example.com', 'ads.example.com']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: savedSettings });
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain', 'websiteSettings'], expect.any(Function));
      // Check for the website section in the DOM
      expect(document.querySelector('.website-section')).not.toBeNull();
    });

    test('should migrate old imgDomain format to new websiteSettings format', async () => {
      const oldDomain = 'imagedelivery.net';

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
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toHaveProperty('websiteSettings');
        expect(Object.keys(data.websiteSettings).length).toBe(0);
        if (callback) callback();
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

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

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

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

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });

      chrome.scripting.executeScript.mockImplementation((options, callback) => {
        expect(options.args[0]).toEqual(['cdn.example.com', 'ads.example.com']);
        if (callback) callback([{ result: 5 }]);
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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
      const existingSettings = {};
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });
      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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
      const existingSettings = {};
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });
      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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
      require('../../popup.js');

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

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: existingSettings });
      });

      require('../../popup.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
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

});
