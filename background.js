chrome.runtime.onInstalled.addListener(() => {
  console.log('[Migration] onInstalled event fired');
  chrome.storage.local.get(['installedAt', 'imgDomain', 'websiteSettings'], (res) => {
    // Set installation timestamp if not exists
    if (!res.installedAt) {
      chrome.storage.local.set({ installedAt: Date.now() });
    }

    // Migrate from old format to new format if needed
    if (res.imgDomain && !res.websiteSettings) {
      console.log('[Migration] Detected old imgDomain format in onInstalled, starting migration...');

      const websiteId = 'website_' + Date.now();
      const websiteSettings = {
        [websiteId]: {
          domain: 'all_websites',
          imageDomains: [res.imgDomain]
        }
      };

      // Save in new format and remove old data
      chrome.storage.local.set({
        websiteSettings: websiteSettings
      }, () => {
        console.log('[Migration] Saved new websiteSettings format in onInstalled');
        chrome.storage.local.remove(['imgDomain'], () => {
          console.log('[Migration] Removed old imgDomain key in onInstalled. Migration completed!');
        });
      });
    } else {
      console.log('[Migration] No migration needed in onInstalled');
    }
  });
});

// Also check for migration on every extension startup (for upgrades)
chrome.runtime.onStartup.addListener(() => {
  console.log('[Migration] onStartup event fired');
  chrome.storage.local.get(['imgDomain', 'websiteSettings'], (res) => {
    // Migrate from old format to new format if needed
    if (res.imgDomain && !res.websiteSettings) {
      console.log('[Migration] Detected old imgDomain format in onStartup, starting migration...');

      const websiteId = 'website_' + Date.now();
      const websiteSettings = {
        [websiteId]: {
          domain: 'all_websites',
          imageDomains: [res.imgDomain]
        }
      };

      // Save in new format and remove old data
      chrome.storage.local.set({
        websiteSettings: websiteSettings
      }, () => {
        console.log('[Migration] Saved new websiteSettings format in onStartup');
        chrome.storage.local.remove(['imgDomain'], () => {
          console.log('[Migration] Removed old imgDomain key in onStartup. Migration completed!');
        });
      });
    } else {
      console.log('[Migration] No migration needed in onStartup');
    }
  });
});
