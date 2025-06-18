/**
 * Unit tests for background.js
 */

describe('Background.js', () => {
  beforeEach(() => {
    // Reset mocks first
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.runtime.onInstalled.addListener.mockClear();
    
    // Clear module cache and import fresh background script
    jest.resetModules();
    require('../../background.js');
  });

  describe('Installation handling', () => {
    test('should set installation timestamp on first install', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });
      chrome.storage.local.set.mockImplementation((data) => {
        // No callback in actual implementation
      });
      
      // Simulate the installation listener
      const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      listener();
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['installedAt'], expect.any(Function));
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { installedAt: expect.any(Number) }
      );
    });

    test('should not set installation timestamp if already exists', () => {
      const existingTimestamp = 1234567890;
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ installedAt: existingTimestamp });
      });
      
      // Simulate the installation listener
      const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      listener();
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['installedAt'], expect.any(Function));
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('should register installation listener', () => {
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Timestamp validation', () => {
    test('should set a valid timestamp', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });
      chrome.storage.local.set.mockImplementation((data) => {
        // No callback in actual implementation
      });
      
      const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      listener();
      
      const setCall = chrome.storage.local.set.mock.calls[0];
      const timestamp = setCall[0].installedAt;
      
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });
}); 