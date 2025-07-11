// Check for website-specific image removal settings
chrome.storage.local.get(['websiteSettings'], (result) => {
  const websiteSettings = result.websiteSettings;
  if (!websiteSettings) return;

  const currentDomain = window.location.hostname;
  let domainsToRemove = [];

  // Find matching website settings for current domain
  Object.values(websiteSettings).forEach(website => {
    if (website.domain && currentDomain.includes(website.domain)) {
      if (website.imageDomains) {
        domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
      }
    }
  });

  if (domainsToRemove.length === 0) return;

  let attempts = 0;
  const maxAttempts = 10;

  const removeImages = () => {
    let removedCount = 0;

    domainsToRemove.forEach(domain => {
      if (domain.trim()) {
        const images = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
        images.forEach(img => {
          img.remove();
          removedCount++;
        });
      }
    });

    attempts++;
    if (attempts < maxAttempts && removedCount === 0) {
      setTimeout(removeImages, 500); // Retry every 500ms up to 5s if no images found
    }
  };

  window.addEventListener('load', () => {
    removeImages(); // Start retry loop after page load
  });
});

