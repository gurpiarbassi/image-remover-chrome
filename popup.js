// DOM elements
// const websitesContainer = document.getElementById('websites-container');
// const addWebsiteBtn = document.getElementById('add-website');
// const removeImagesBtn = document.getElementById('remove-images');
// const statusDiv = document.getElementById('status');

// Data structure: { websiteSettings: { "example.com": ["cdn1.com", "cdn2.com"] } }
let websiteSettings = {};

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

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

// Setup event listeners
function setupEventListeners () {
  document.getElementById('add-website').addEventListener('click', addWebsite);
  document.getElementById('remove-images').addEventListener('click', removeImagesOnCurrentPage);
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

// Update website domain
function updateWebsiteDomain (websiteId, domain) {
  websiteSettings[websiteId].domain = domain;
  saveSettings();
  return true;
}

// Update image domain
function updateImageDomain (websiteId, index, domain) {
  websiteSettings[websiteId].imageDomains[index] = domain;
  saveSettings();
}

// Render all websites in the UI
function renderWebsites () {
  const websitesContainer = document.getElementById('websites-container');
  websitesContainer.innerHTML = '';

  if (Object.keys(websiteSettings).length === 0) {
    websitesContainer.innerHTML = `
            <div class="empty-state">
                No websites configured yet. Click "Add Website" to get started.
            </div>
        `;
    return;
  }

  // Sort website IDs by domain
  const sortedWebsiteIds = Object.keys(websiteSettings).sort((idA, idB) => {
    const domainA = (websiteSettings[idA].domain || '').toLowerCase();
    const domainB = (websiteSettings[idB].domain || '').toLowerCase();
    return domainA.localeCompare(domainB);
  });

  sortedWebsiteIds.forEach(websiteId => {
    const website = websiteSettings[websiteId];
    const websiteSection = createWebsiteSection(websiteId, website);
    websitesContainer.appendChild(websiteSection);
  });
}

// Create a website section element
function createWebsiteSection (websiteId, website) {
  const section = document.createElement('div');
  section.className = 'website-section';

  const domain = website.domain || '';
  // Sort imageDomains alphabetically for display
  const imageDomains = (website.imageDomains || ['']).slice().sort((a, b) => a.localeCompare(b));

  section.innerHTML = `
        <div class="website-header">
            <input 
                type="text" 
                class="website-input" 
                placeholder="e.g. google.com"
                value="${domain}"
                data-website-id="${websiteId}"
                data-field="domain"
            >
            <button class="delete-btn" data-website-id="${websiteId}">×</button>
        </div>
        <div class="domains-list">
            ${imageDomains.map((imgDomain, index) => `
                <div class="domain-item">
                    <input 
                        type="text" 
                        class="domain-input" 
                        placeholder="Enter image domain to remove"
                        value="${imgDomain}"
                        data-website-id="${websiteId}"
                        data-index="${index}"
                        data-field="imageDomain"
                    >
                    <button class="remove-domain-btn" data-website-id="${websiteId}" data-index="${index}">×</button>
                </div>
            `).join('')}
            <button class="add-domain-btn" data-website-id="${websiteId}">+ Add Image Domain</button>
        </div>
    `;

  // Add event listeners
  setupWebsiteEventListeners(section, websiteId);

  return section;
}

// Setup event listeners for a website section
function setupWebsiteEventListeners (section, websiteId) {
  // Website domain input
  const domainInput = section.querySelector('.website-input');
  domainInput.addEventListener('input', (e) => {
    const domain = e.target.value;

    // Visual feedback for duplicate or invalid domains
    if (domain.trim() && isDuplicateDomain(domain, websiteId)) {
      domainInput.classList.add('error');
      domainInput.title = 'This domain is already configured for another website';
      showStatus('This domain is already configured for another website', 'error');
      return; // Don't save invalid data
    } else if (domain.trim() && !isValidDomain(domain)) {
      domainInput.classList.add('error');
      domainInput.title = 'Please enter a valid domain like google.com';
      showStatus('Please enter a valid domain like google.com', 'error');
      return; // Don't save invalid data
    } else {
      domainInput.classList.remove('error');
      domainInput.title = '';
    }

    // Only update the domain if validation passes
    updateWebsiteDomain(websiteId, domain);
  });

  // Delete website button
  const deleteWebsiteBtn = section.querySelector('.delete-btn');
  deleteWebsiteBtn.addEventListener('click', () => {
    removeWebsite(websiteId);
  });

  // Image domain inputs
  const imageDomainInputs = section.querySelectorAll('.domain-input');
  imageDomainInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      updateImageDomain(websiteId, index, e.target.value);
    });
  });

  // Remove image domain buttons
  const removeDomainBtns = section.querySelectorAll('.remove-domain-btn');
  removeDomainBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeImageDomain(websiteId, index);
    });
  });

  // Add image domain button
  const addDomainBtn = section.querySelector('.add-domain-btn');
  addDomainBtn.addEventListener('click', () => {
    addImageDomain(websiteId);
  });
}

// Remove images on the current page
function removeImagesOnCurrentPage () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    const currentDomain = new URL(currentUrl).hostname;

    // Find matching website settings
    let domainsToRemove = [];

    Object.values(websiteSettings).forEach(website => {
      if (website.domain && currentDomain.includes(website.domain)) {
        domainsToRemove = domainsToRemove.concat(website.imageDomains.filter(d => d.trim()));
      }
    });

    if (domainsToRemove.length === 0) {
      showStatus('No image domains configured for this website', 'error');
      return;
    }

    // Remove images from all matching domains
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (domainsToRemove) => {
        let removedCount = 0;
        domainsToRemove.forEach(domain => {
          if (domain.trim()) {
            const matches = document.querySelectorAll(`img[src*="${domain.trim()}"]`);
            matches.forEach(img => {
              img.remove();
              removedCount++;
            });
          }
        });
        return removedCount;
      },
      args: [domainsToRemove]
    }, (result) => {
      if (chrome.runtime.lastError) {
        showStatus('Error removing images: ' + chrome.runtime.lastError.message, 'error');
      } else {
        const removedCount = result[0].result;
        showStatus(`Removed ${removedCount} images!`, 'success');
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

// Expose for tests
if (typeof window !== 'undefined') {
  window.isDuplicateDomain = isDuplicateDomain;
}
