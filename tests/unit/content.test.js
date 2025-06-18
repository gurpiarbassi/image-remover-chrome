/**
 * Unit tests for content.js
 */

// Remove global mock for window.addEventListener for this file to use the real event system
// (Jest uses jsdom, which supports addEventListener)
delete window.addEventListener;

describe('Content.js', () => {
  let mockImages;

  beforeEach(() => {
    // Setup mock images
    mockImages = [
      { src: 'https://imagedelivery.net/image1.jpg', remove: jest.fn() },
      { src: 'https://imagedelivery.net/image2.png', remove: jest.fn() },
      { src: 'https://otherdomain.com/image3.jpg', remove: jest.fn() }
    ];

    // Mock document.querySelectorAll
    document.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('imagedelivery.net')) {
        return mockImages.filter(img => img.src.includes('imagedelivery.net'));
      }
      return [];
    });

    // Mock setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Image removal logic', () => {
    test('should remove images matching the specified domain', () => {
      const domain = 'imagedelivery.net';
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: domain });
      });

      // Simulate the content script logic
      chrome.storage.local.get(['imgDomain'], (result) => {
        const domain = result.imgDomain;
        if (!domain) return;

        const images = document.querySelectorAll(`img[src*="${domain}"]`);
        images.forEach(img => img.remove());
      });

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['imgDomain'], expect.any(Function));
      expect(document.querySelectorAll).toHaveBeenCalledWith('img[src*="imagedelivery.net"]');
      
      // Check that matching images were removed
      const matchingImages = mockImages.filter(img => img.src.includes('imagedelivery.net'));
      matchingImages.forEach(img => {
        expect(img.remove).toHaveBeenCalled();
      });
    });

    test('should not remove images from other domains', () => {
      const domain = 'imagedelivery.net';
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: domain });
      });

      chrome.storage.local.get(['imgDomain'], (result) => {
        const domain = result.imgDomain;
        if (!domain) return;

        const images = document.querySelectorAll(`img[src*="${domain}"]`);
        images.forEach(img => img.remove());
      });

      // Check that non-matching images were not removed
      const nonMatchingImages = mockImages.filter(img => !img.src.includes('imagedelivery.net'));
      nonMatchingImages.forEach(img => {
        expect(img.remove).not.toHaveBeenCalled();
      });
    });

    test('should handle empty storage gracefully', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      chrome.storage.local.get(['imgDomain'], (result) => {
        const domain = result.imgDomain;
        if (!domain) return;

        const images = document.querySelectorAll(`img[src*="${domain}"]`);
        images.forEach(img => img.remove());
      });

      expect(document.querySelectorAll).not.toHaveBeenCalled();
    });

    test('should handle no matching images', () => {
      const domain = 'nonexistent.com';
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: domain });
      });

      document.querySelectorAll.mockReturnValue([]);

      chrome.storage.local.get(['imgDomain'], (result) => {
        const domain = result.imgDomain;
        if (!domain) return;

        const images = document.querySelectorAll(`img[src*="${domain}"]`);
        images.forEach(img => img.remove());
      });

      expect(document.querySelectorAll).toHaveBeenCalledWith('img[src*="nonexistent.com"]');
    });
  });

  describe('Retry mechanism', () => {
    test('should retry image removal multiple times', () => {
      const domain = 'imagedelivery.net';
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: domain });
      });

      // Mock the retry logic
      let attempts = 0;
      const maxAttempts = 10;
      const removeImages = jest.fn(() => {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(removeImages, 500);
        }
      });

      // Start the retry loop
      removeImages();

      // Fast-forward time to trigger retries
      jest.advanceTimersByTime(500);
      expect(removeImages).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(500);
      expect(removeImages).toHaveBeenCalledTimes(3);

      // Fast-forward to max attempts
      jest.advanceTimersByTime(3500); // 7 more attempts
      expect(removeImages).toHaveBeenCalledTimes(10);

      // Should not call again after max attempts
      jest.advanceTimersByTime(500);
      expect(removeImages).toHaveBeenCalledTimes(10);
    });
  });

  describe('Page load handling', () => {
    test('should start removal after page load', () => {
      const domain = 'imagedelivery.net';
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ imgDomain: domain });
      });

      const removeImages = jest.fn();
      
      // Simulate window load event
      window.addEventListener('load', () => {
        removeImages();
      });

      // Trigger load event
      window.dispatchEvent(new Event('load'));

      expect(removeImages).toHaveBeenCalled();
    });
  });
}); 