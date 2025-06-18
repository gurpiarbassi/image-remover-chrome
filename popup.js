const input = document.getElementById('domain');
const saveBtn = document.getElementById('save');
const removeBtn = document.getElementById('remove');

chrome.storage.local.get(['imgDomain'], (result) => {
  if (result.imgDomain) {
    input.value = result.imgDomain;
  }
});

saveBtn.addEventListener('click', () => {
  const domain = input.value.trim();
  chrome.storage.local.set({ imgDomain: domain }, () => {
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1000);
  });
});

removeBtn.addEventListener('click', () => {
  chrome.storage.local.get(['imgDomain'], (result) => {
    const domain = result.imgDomain;
    if (!domain) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (domain) => {
          const matches = document.querySelectorAll(`img[src*="${domain}"]`);
          matches.forEach(img => img.remove());
        },
        args: [domain]
      });
    });
  });
});
