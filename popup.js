// DOM elements
const websitesContainer = document.getElementById('websites-container');
const addWebsiteBtn = document.getElementById('add-website');
const removeImagesBtn = document.getElementById('remove-images');
const statusDiv = document.getElementById('status');

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
  chrome.storage.local.set({ websiteSettings: websiteSettings }, () => {
    showStatus('Settings saved!', 'success');
  });
}

// Setup event listeners
function setupEventListeners () {
  addWebsiteBtn.addEventListener('click', addWebsite);
  removeImagesBtn.addEventListener('click', removeImagesOnCurrentPage);
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

// Update website domain
function updateWebsiteDomain (websiteId, domain) {
  websiteSettings[websiteId].domain = domain;
  saveSettings();
}

// Update image domain
function updateImageDomain (websiteId, index, domain) {
  websiteSettings[websiteId].imageDomains[index] = domain;
  saveSettings();
}

// Render all websites in the UI
function renderWebsites () {
  websitesContainer.innerHTML = '';

  if (Object.keys(websiteSettings).length === 0) {
    websitesContainer.innerHTML = `
            <div class="empty-state">
                No websites configured yet. Click "Add Website" to get started.
            </div>
        `;
    return;
  }

  Object.keys(websiteSettings).forEach(websiteId => {
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
  const imageDomains = website.imageDomains || [''];

  section.innerHTML = `
        <div class="website-header">
            <input 
                type="text" 
                class="website-input" 
                placeholder="Enter website domain (e.g., example.com)"
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
    updateWebsiteDomain(websiteId, e.target.value);
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
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}
