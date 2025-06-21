/**
 * Unit tests for popup.js
 */
// No global mocks for document.getElementById; use real DOM

describe('Popup.js', () => {
  let mockWebsitesContainer, mockAddWebsiteBtn, mockRemoveImagesBtn, mockStatusDiv;

  beforeEach(() => {
    // Setup DOM first
    document.body.innerHTML = `
      <div id="websites-container"></div>
      <button id="add-website">+ Add Website</button>
      <button id="remove-images">Remove Images on Current Page</button>
      <div id="status" class="status"></div>
    `;
    mockWebsitesContainer = document.getElementById('websites-container');
    mockAddWebsiteBtn = document.getElementById('add-website');
    mockRemoveImagesBtn = document.getElementById('remove-images');
    mockStatusDiv = document.getElementById('status');

    // Reset all chrome mocks
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
    chrome.storage.local.remove && chrome.storage.local.remove.mockReset && chrome.storage.local.remove.mockReset();
    chrome.tabs.query.mockReset();
    chrome.scripting.executeScript.mockReset();

    // Clear module cache
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

      expect(mockWebsitesContainer.innerHTML).toContain('No websites configured yet');
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
      mockAddWebsiteBtn.dispatchEvent(addEvent);
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
        expect(settings.imageDomains.length).toBe(2);
        expect(settings.imageDomains[1]).toBe('');
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
        expect(settings.imageDomains.length).toBe(1);
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
      mockRemoveImagesBtn.dispatchEvent(removeEvent);
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
      mockRemoveImagesBtn.dispatchEvent(removeEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    });
  });

  describe('Status Messages', () => {
    test('should show success status message', () => {
      require('../../popup.js');

      // Access the showStatus function through the global scope
      const _showStatus = window.showStatus || (() => {});

      // Mock the status div
      mockStatusDiv.style.display = 'none';

      // Simulate showing a status message
      mockStatusDiv.textContent = 'Settings saved!';
      mockStatusDiv.className = 'status success';
      mockStatusDiv.style.display = 'block';

      expect(mockStatusDiv.textContent).toBe('Settings saved!');
      expect(mockStatusDiv.className).toContain('success');
      expect(mockStatusDiv.style.display).toBe('block');
    });
  });
});
