
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['installedAt'], (res) => {
    if (!res.installedAt) {
      chrome.storage.local.set({ installedAt: Date.now() });
    }
  });
});
