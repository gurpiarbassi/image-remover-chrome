/**
 * Unit tests for popup.js
 */
// No global mocks for document.getElementById; use real DOM

describe('Popup.js', () => {
  let mockInput, mockSaveBtn, mockRemoveBtn;

  beforeEach(() => {
    // Setup DOM first
    document.body.innerHTML = `
      <textarea id="domain"></textarea>
      <button id="save">Save</button>
      <button id="remove">Remove Images</button>
    `;
    mockInput = document.getElementById('domain');
    mockSaveBtn = document.getElementById('save');
    mockRemoveBtn = document.getElementById('remove');

    // Mock chrome APIs before requiring popup.js
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({});
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });
    chrome.tabs.query.mockImplementation((queryInfo, callback) => {
      callback([{ id: 123 }]);
    });
    chrome.scripting.executeScript.mockImplementation((options, callback) => {
      if (callback) callback();
    });

    // Clear module cache and import fresh popup.js
    jest.resetModules();
    require('../../popup.js');
  });

  describe('Initialization', () => {
    test('should load saved domain from storage on initialization', () => {
      const savedDomain = 'imagedelivery.net';
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: savedDomain });
      });

      // Re-require popup.js to trigger initialization
      jest.resetModules();
      require('../../popup.js');

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain'], expect.any(Function));
      expect(mockInput.value).toBe(savedDomain);
    });

    test('should handle empty storage gracefully', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      // Re-require popup.js to trigger initialization
      jest.resetModules();
      require('../../popup.js');

      expect(mockInput.value).toBe('');
    });
  });

  describe('Save functionality', () => {
    test('should save domain to storage when save button is clicked', () => {
      const domainToSave = 'example.com';
      mockInput.value = domainToSave;

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      // Simulate save button click
      const saveEvent = new Event('click');
      mockSaveBtn.dispatchEvent(saveEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { imgDomain: domainToSave },
        expect.any(Function)
      );
    });

    test('should trim whitespace from domain input', () => {
      const domainWithWhitespace = '  example.com  ';
      mockInput.value = domainWithWhitespace;

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      const saveEvent = new Event('click');
      mockSaveBtn.dispatchEvent(saveEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { imgDomain: 'example.com' }, // Should be trimmed
        expect.any(Function)
      );
    });

    test('should show "Saved!" feedback after successful save', () => {
      mockInput.value = 'example.com';

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      const saveEvent = new Event('click');
      mockSaveBtn.dispatchEvent(saveEvent);

      // The button text should be "Saved!" immediately after the callback
      expect(mockSaveBtn.textContent).toBe('Saved!');
    });
  });

  describe('Manual removal functionality', () => {
    test('should execute removal script when remove button is clicked', () => {
      const domain = 'imagedelivery.net';

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: domain });
      });

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        callback([{ id: 123 }]);
      });

      chrome.scripting.executeScript.mockImplementation((options, callback) => {
        if (callback) callback();
      });

      const removeEvent = new Event('click');
      mockRemoveBtn.dispatchEvent(removeEvent);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain'], expect.any(Function));
      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
        args: [domain]
      });
    });

    test('should not execute removal if no domain is saved', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const removeEvent = new Event('click');
      mockRemoveBtn.dispatchEvent(removeEvent);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain'], expect.any(Function));
      expect(chrome.tabs.query).not.toHaveBeenCalled();
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    });
  });
});
