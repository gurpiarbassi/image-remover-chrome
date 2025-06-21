// DOM elements
// const websitesContainer = document.getElementById('websites-container');
// const addWebsiteBtn = document.getElementById('add-website');
// const removeImagesBtn = document.getElementById('remove-images');
// const statusDiv = document.getElementById('status');

// Create a factory function to manage popup state
function createPopupManager () {
  // Data structure: { websiteSettings: { "example.com": ["cdn1.com", "cdn2.com"] } }
  let websiteSettings = {};

  // Debounce timers for saving
  let saveTimers = {};

  // Cleanup function to clear all pending timers
  function cleanupTimers () {
    Object.keys(saveTimers).forEach(websiteId => {
      if (saveTimers[websiteId]) {
        clearTimeout(saveTimers[websiteId]);
      }
    });
    saveTimers = {};
  }

  // Reset function for tests
  function reset () {
    websiteSettings = {};
    cleanupTimers();
  }

  // Load settings from storage with backward compatibility
  function loadSettings () {
    chrome.storage.local.get(['imgDomain', 'websiteSettings'], (result) => {
      if (result.websiteSettings) {
        // New format already exists
        websiteSettings = result.websiteSettings;
      } else if (result.imgDomain) {
        // Migrate from old format
        const websiteId = 'website_' + Date.now();
        websiteSettings = {
          [websiteId]: {
            domain: 'all_websites',
            imageDomains: [result.imgDomain]
          }
        };
        // Save in new format and remove old data
        chrome.storage.local.set({
          websiteSettings: websiteSettings
        }, () => {
          chrome.storage.local.remove(['imgDomain']);
        });
      }

      renderWebsites();
    });
  }

  // Save settings to storage
  function saveSettings () {
    // Sort websites by domain
    const sortedWebsiteEntries = Object.entries(websiteSettings)
      .sort(([, a], [, b]) => {
        const domainA = (a.domain || '').toLowerCase();
        const domainB = (b.domain || '').toLowerCase();
        return domainA.localeCompare(domainB);
      })
      .map(([websiteId, website]) => {
        // Sort imageDomains for each website
        const sortedDomains = (website.imageDomains || []).slice().sort((a, b) => a.localeCompare(b));
        return [websiteId, { ...website, imageDomains: sortedDomains }];
      });

    // Create a new sorted object
    const sortedWebsiteSettings = Object.fromEntries(sortedWebsiteEntries);
    websiteSettings = sortedWebsiteSettings;

    chrome.storage.local.set({ websiteSettings: websiteSettings }, () => {
      showStatus('Settings saved!', 'success');
    });
  }

  // Debounced save function
  function debouncedSave (websiteId, delay = 1000) {
    // Clear existing timer for this website
    if (saveTimers[websiteId]) {
      clearTimeout(saveTimers[websiteId]);
    }

    // Set new timer
    saveTimers[websiteId] = setTimeout(() => {
      saveSettings();
      delete saveTimers[websiteId];
    }, delay);
  }

  // Add a new website section
  function addWebsite () {
    const websiteId = 'website_' + Date.now();
    websiteSettings[websiteId] = {
      domain: '',
      imageDomains: ['']
    };

    renderWebsites();
    saveSettings();

    // Focus on the new website input for better UX
    setTimeout(() => {
      const newWebsiteInput = document.querySelector(`[data-website-id="${websiteId}"][data-field="domain"]`);
      if (newWebsiteInput) {
        newWebsiteInput.focus();
      }
    }, 100);
  }

  // Remove a website and all its settings
  function removeWebsite (websiteId) {
    // Clear any pending save timer
    if (saveTimers[websiteId]) {
      clearTimeout(saveTimers[websiteId]);
      delete saveTimers[websiteId];
    }

    delete websiteSettings[websiteId];
    renderWebsites();
    saveSettings();
  }

  // Add a new image domain to a website
  function addImageDomain (websiteId) {
    if (!websiteSettings[websiteId].imageDomains) {
      websiteSettings[websiteId].imageDomains = [''];
    }
    websiteSettings[websiteId].imageDomains.push('');
    renderWebsites();
    saveSettings();
  }

  // Remove an image domain from a website
  function removeImageDomain (websiteId, index) {
    websiteSettings[websiteId].imageDomains.splice(index, 1);
    if (websiteSettings[websiteId].imageDomains.length === 0) {
      websiteSettings[websiteId].imageDomains = [''];
    }
    renderWebsites();
    saveSettings();
  }

  // Check if a domain already exists (excluding the current website)
  function isDuplicateDomain (domain, currentWebsiteId) {
    if (!domain.trim()) return false;

    return Object.keys(websiteSettings).some(websiteId => {
      if (websiteId === currentWebsiteId) return false; // Skip current website
      return websiteSettings[websiteId].domain &&
             websiteSettings[websiteId].domain.trim().toLowerCase() === domain.trim().toLowerCase();
    });
  }

  // Helper to validate a domain (e.g., google.com, my-site.org)
  function isValidDomain (domain) {
    // Only allow domains like example.com, sub.example.co.uk, etc. No protocol, no path
    return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain.trim());
  }

  // Helper to validate an image domain (can be empty or valid domain)
  function isValidImageDomain (domain) {
    if (!domain.trim()) return true; // Empty is valid
    return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain.trim());
  }

  // Update website domain with validation and debounced saving
  function updateWebsiteDomain (websiteId, domain) {
    // Update the data structure immediately for UI consistency
    websiteSettings[websiteId].domain = domain;

    // Validate the domain
    const isValid = !domain.trim() || (isValidDomain(domain) && !isDuplicateDomain(domain, websiteId));

    if (isValid) {
      // Only save if validation passes
      debouncedSave(websiteId);
    }

    return isValid;
  }

  // Update image domain with validation and debounced saving
  function updateImageDomain (websiteId, index, domain) {
    // Update the data structure immediately for UI consistency
    websiteSettings[websiteId].imageDomains[index] = domain;

    // Validate the image domain
    const isValid = isValidImageDomain(domain);

    if (isValid) {
      // Only save if validation passes
      debouncedSave(websiteId);
    }

    return isValid;
  }

  // Render all websites in the UI
  function renderWebsites () {
    const websitesContainer = document.getElementById('websites-container');
    websitesContainer.innerHTML = '';

    if (Object.keys(websiteSettings).length === 0) {
      websitesContainer.innerHTML = '<div class="empty-state">No websites configured yet</div>';
      return;
    }

    // Sort website IDs by domain
    const sortedWebsiteIds = Object.keys(websiteSettings).sort((idA, idB) => {
      const domainA = (websiteSettings[idA].domain || '').toLowerCase();
      const domainB = (websiteSettings[idB].domain || '').toLowerCase();
      return domainA.localeCompare(domainB);
    });

    sortedWebsiteIds.forEach(websiteId => {
      // Sort image domains for display only
      const website = websiteSettings[websiteId];
      const sortedImageDomains = (website.imageDomains || []).slice().sort((a, b) => a.localeCompare(b));
      const websiteForDisplay = { ...website, imageDomains: sortedImageDomains };
      const section = createWebsiteSection(websiteId, websiteForDisplay);
      websitesContainer.appendChild(section);
      setupWebsiteEventListeners(section, websiteId);
    });
  }

  // Create a website section element
  function createWebsiteSection (websiteId, website) {
    const section = document.createElement('div');
    section.className = 'website-section';
    section.setAttribute('data-website-id', websiteId);

    const header = document.createElement('div');
    header.className = 'website-header';

    const domainInput = document.createElement('input');
    domainInput.type = 'text';
    domainInput.className = 'website-input';
    domainInput.placeholder = 'Enter website domain (e.g., example.com)';
    domainInput.value = website.domain || '';
    domainInput.setAttribute('data-website-id', websiteId);
    domainInput.setAttribute('data-field', 'domain');

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => removeWebsite(websiteId);

    header.appendChild(domainInput);
    header.appendChild(deleteBtn);

    const domainsList = document.createElement('div');
    domainsList.className = 'domains-list';

    (website.imageDomains || ['']).forEach((domain, index) => {
      const domainItem = document.createElement('div');
      domainItem.className = 'domain-item';

      const domainInput = document.createElement('input');
      domainInput.type = 'text';
      domainInput.className = 'domain-input';
      domainInput.placeholder = 'Enter image domain (e.g., cdn.example.com)';
      domainInput.value = domain;
      domainInput.setAttribute('data-website-id', websiteId);
      domainInput.setAttribute('data-field', 'imageDomain');
      domainInput.setAttribute('data-index', index);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-domain-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => removeImageDomain(websiteId, index);

      domainItem.appendChild(domainInput);
      domainItem.appendChild(removeBtn);
      domainsList.appendChild(domainItem);
    });

    const addDomainBtn = document.createElement('button');
    addDomainBtn.className = 'add-domain-btn';
    addDomainBtn.textContent = '+ Add Image Domain';
    addDomainBtn.onclick = () => addImageDomain(websiteId);

    section.appendChild(header);
    section.appendChild(domainsList);
    section.appendChild(addDomainBtn);

    return section;
  }

  // Setup event listeners for website sections
  function setupWebsiteEventListeners (section, websiteId) {
    // Website domain input
    const domainInput = section.querySelector('[data-field="domain"]');
    if (domainInput) {
      domainInput.addEventListener('input', (e) => {
        const isValid = updateWebsiteDomain(websiteId, e.target.value);

        // Update visual feedback
        if (e.target.value.trim()) {
          if (isValid) {
            e.target.classList.remove('error');
            e.target.title = '';
          } else {
            e.target.classList.add('error');
            if (isDuplicateDomain(e.target.value, websiteId)) {
              e.target.title = 'This domain is already configured for another website';
            } else if (!isValidDomain(e.target.value)) {
              e.target.title = 'Please enter a valid domain like google.com';
            }
          }
        } else {
          e.target.classList.remove('error');
          e.target.title = '';
        }
      });

      domainInput.addEventListener('blur', (e) => {
        const domain = e.target.value.trim();
        if (domain) {
          const isValid = isValidDomain(domain) && !isDuplicateDomain(domain, websiteId);
          if (!isValid) {
            e.target.classList.add('error');
            if (isDuplicateDomain(domain, websiteId)) {
              e.target.title = 'This domain is already configured for another website';
            } else if (!isValidDomain(domain)) {
              e.target.title = 'Please enter a valid domain like google.com';
            }
          }
        }
      });
    }

    // Image domain inputs
    const imageDomainInputs = section.querySelectorAll('[data-field="imageDomain"]');
    imageDomainInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        const isValid = updateImageDomain(websiteId, index, e.target.value);

        // Update visual feedback
        if (e.target.value.trim()) {
          if (isValid) {
            e.target.classList.remove('error');
            e.target.title = '';
          } else {
            e.target.classList.add('error');
            e.target.title = 'Please enter a valid domain like cdn.example.com';
          }
        } else {
          e.target.classList.remove('error');
          e.target.title = '';
        }
      });

      input.addEventListener('blur', (e) => {
        const domain = e.target.value.trim();
        if (domain) {
          const isValid = isValidImageDomain(domain);
          if (!isValid) {
            e.target.classList.add('error');
            e.target.title = 'Please enter a valid domain like cdn.example.com';
          }
        }
      });
    });
  }

  // Remove images on the current page
  function removeImagesOnCurrentPage () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const currentUrl = new URL(currentTab.url);
      const currentDomain = currentUrl.hostname;

      // Find matching website settings
      const matchingWebsite = Object.values(websiteSettings).find(website =>
        website.domain && website.domain.trim().toLowerCase() === currentDomain.toLowerCase()
      );

      if (!matchingWebsite || !matchingWebsite.imageDomains || matchingWebsite.imageDomains.length === 0) {
        showStatus('No domains configured for this website. Please add image domains first.', 'error');
        return;
      }

      // Filter out empty domains
      const imageDomains = matchingWebsite.imageDomains.filter(domain => domain.trim());

      if (imageDomains.length === 0) {
        showStatus('No valid image domains configured for this website.', 'error');
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (domains) => {
          const images = document.querySelectorAll('img');
          let removedCount = 0;

          images.forEach(img => {
            try {
              const imgUrl = new URL(img.src);
              const imgDomain = imgUrl.hostname;

              if (domains.some(domain => imgDomain.includes(domain))) {
                img.style.display = 'none';
                removedCount++;
              }
            } catch (_) { // eslint-disable-line no-unused-vars
              // Skip invalid URLs
            }
          });

          return removedCount;
        },
        args: [imageDomains]
      }, (results) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else {
          const removedCount = results[0].result;
          showStatus(`Removed ${removedCount} images from ${currentDomain}`, 'success');
        }
      });
    });
  }

  // Show status message
  function showStatus (message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Named handler functions for event listeners
  function handleAddWebsiteClick () {
    addWebsite();
  }
  function handleRemoveImagesClick () {
    removeImagesOnCurrentPage();
  }

  // Setup event listeners
  function setupEventListeners () {
    const addWebsiteBtn = document.getElementById('add-website');
    const removeImagesBtn = document.getElementById('remove-images');
    if (addWebsiteBtn) {
      addWebsiteBtn.removeEventListener('click', handleAddWebsiteClick);
      addWebsiteBtn.addEventListener('click', handleAddWebsiteClick);
    }
    if (removeImagesBtn) {
      removeImagesBtn.removeEventListener('click', handleRemoveImagesClick);
      removeImagesBtn.addEventListener('click', handleRemoveImagesClick);
    }
  }

  // Initialize the popup
  function init () {
    loadSettings();
    setupEventListeners();
  }

  // Clean up timers when popup is about to unload
  window.addEventListener('beforeunload', cleanupTimers);

  // Return public API
  return {
    init,
    reset,
    isDuplicateDomain,
    addWebsite,
    removeWebsite,
    addImageDomain,
    removeImageDomain,
    updateWebsiteDomain,
    updateImageDomain,
    removeImagesOnCurrentPage,
    showStatus
  };
}

// Create the popup manager instance
const popupManager = createPopupManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  popupManager.init();
});

// Expose for tests
if (typeof window !== 'undefined') {
  window.popupManager = popupManager;
  window.isDuplicateDomain = popupManager.isDuplicateDomain;
  window.resetPopupState = () => popupManager.reset();
}
