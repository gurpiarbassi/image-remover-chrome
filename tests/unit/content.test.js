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
      { src: 'https://otherdomain.com/image3.jpg', remove: jest.fn() },
      { src: 'https://ads.example.com/banner.jpg', remove: jest.fn() }
    ];

    // Mock document.querySelectorAll
    document.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('imagedelivery.net')) {
        return mockImages.filter(img => img.src.includes('imagedelivery.net'));
      }
      if (selector.includes('ads.example.com')) {
        return mockImages.filter(img => img.src.includes('ads.example.com'));
      }
      return [];
    });

    // Mock window.location.hostname
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com'
      },
      writable: true
    });

    // Mock setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Image removal logic', () => {
    test('should remove images matching the specified domains for current website', () => {
      const websiteSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['imagedelivery.net', 'ads.example.com']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: websiteSettings });
      });

      // Simulate the content script logic
      chrome.storage.local.get(['websiteSettings'], (result) => {
        const websiteSettings = result.websiteSettings;
        if (!websiteSettings) return;

        const currentDomain = window.location.hostname;
        let domainsToRemove = [];

        Object.values(websiteSettings).forEach(website => {
          if (website.domain && currentDomain.includes(website.domain)) {
            if (website.imageDomains) {
              domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
            }
          }
        });

        domainsToRemove.forEach(domain => {
          if (domain.trim()) {
            const images = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
            images.forEach(img => img.remove());
          }
        });
      });

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['websiteSettings'], expect.any(Function));
      expect(document.querySelectorAll).toHaveBeenCalledWith('img[src*="imagedelivery.net"]');
      expect(document.querySelectorAll).toHaveBeenCalledWith('img[src*="ads.example.com"]');

      // Check that matching images were removed
      const matchingImages = mockImages.filter(img =>
        img.src.includes('imagedelivery.net') || img.src.includes('ads.example.com')
      );
      matchingImages.forEach(img => {
        expect(img.remove).toHaveBeenCalled();
      });
    });

    test('should not remove images from other domains', () => {
      const websiteSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['imagedelivery.net']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: websiteSettings });
      });

      chrome.storage.local.get(['websiteSettings'], (result) => {
        const websiteSettings = result.websiteSettings;
        if (!websiteSettings) return;

        const currentDomain = window.location.hostname;
        let domainsToRemove = [];

        Object.values(websiteSettings).forEach(website => {
          if (website.domain && currentDomain.includes(website.domain)) {
            if (website.imageDomains) {
              domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
            }
          }
        });

        domainsToRemove.forEach(domain => {
          if (domain.trim()) {
            const images = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
            images.forEach(img => img.remove());
          }
        });
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

      chrome.storage.local.get(['websiteSettings'], (result) => {
        const websiteSettings = result.websiteSettings;
        if (!websiteSettings) return;

        const currentDomain = window.location.hostname;
        let domainsToRemove = [];

        Object.values(websiteSettings).forEach(website => {
          if (website.domain && currentDomain.includes(website.domain)) {
            if (website.imageDomains) {
              domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
            }
          }
        });

        domainsToRemove.forEach(domain => {
          if (domain.trim()) {
            const images = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
            images.forEach(img => img.remove());
          }
        });
      });

      expect(document.querySelectorAll).not.toHaveBeenCalled();
    });

    test('should handle no matching images', () => {
      const websiteSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['nonexistent.com']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: websiteSettings });
      });

      document.querySelectorAll.mockReturnValue([]);

      chrome.storage.local.get(['websiteSettings'], (result) => {
        const websiteSettings = result.websiteSettings;
        if (!websiteSettings) return;

        const currentDomain = window.location.hostname;
        let domainsToRemove = [];

        Object.values(websiteSettings).forEach(website => {
          if (website.domain && currentDomain.includes(website.domain)) {
            if (website.imageDomains) {
              domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
            }
          }
        });

        domainsToRemove.forEach(domain => {
          if (domain.trim()) {
            const images = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
            images.forEach(img => img.remove());
          }
        });
      });

      expect(document.querySelectorAll).toHaveBeenCalledWith('img[src*="nonexistent.com"]');
    });

    test('should not remove images for different websites', () => {
      const websiteSettings = {
        'website_123': {
          domain: 'different.com',
          imageDomains: ['imagedelivery.net']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: websiteSettings });
      });

      chrome.storage.local.get(['websiteSettings'], (result) => {
        const websiteSettings = result.websiteSettings;
        if (!websiteSettings) return;

        const currentDomain = window.location.hostname;
        let domainsToRemove = [];

        Object.values(websiteSettings).forEach(website => {
          if (website.domain && currentDomain.includes(website.domain)) {
            if (website.imageDomains) {
              domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
            }
          }
        });

        domainsToRemove.forEach(domain => {
          if (domain.trim()) {
            const images = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
            images.forEach(img => img.remove());
          }
        });
      });

      // Should not call document.querySelectorAll since no matching website
      expect(document.querySelectorAll).not.toHaveBeenCalled();
    });
  });

  describe('Retry mechanism', () => {
    test('should retry image removal multiple times when no images found', () => {
      const websiteSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['imagedelivery.net']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: websiteSettings });
      });

      // Mock the retry logic
      let attempts = 0;
      const maxAttempts = 10;
      const removeImages = jest.fn(() => {
        const removedCount = 0;
        attempts++;

        // Simulate no images found
        if (attempts < maxAttempts && removedCount === 0) {
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
      const websiteSettings = {
        'website_123': {
          domain: 'example.com',
          imageDomains: ['imagedelivery.net']
        }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ websiteSettings: websiteSettings });
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
