chrome.storage.local.get(['imgDomain'], (result) => {
    const domain = result.imgDomain;
    if (!domain) return;

    let attempts = 0;
    const maxAttempts = 10;

    const removeImages = () => {
        const images = document.querySelectorAll(`img[src*="${domain}"]`);
        if (images.length > 0) {
            images.forEach(img => img.remove());
            console.log(`Removed ${images.length} images for domain:`, domain);
        }

        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(removeImages, 500); // Retry every 500ms up to 5s
        }
    };

    window.addEventListener('load', () => {
        removeImages(); // Start retry loop after page load
    });
});

