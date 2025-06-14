# 🧹 Custom Image Remover – Chrome Extension

This lightweight Chrome extension automatically removes images from web pages if their source URLs contain a user-specified domain.

## 🚀 Features

- 🔧 Specify one or more image host domains (e.g. `imagedelivery.net`)
- 🧼 Removes matching images **automatically on page load**
- 🧠 Remembers your preferences between sessions
- 🖱️ Optional manual trigger via popup button
- ✅ Privacy-first: No server, no tracking, no data collection

---

## 🛠 How It Works

1. Install the extension in Chrome
2. Click the extension icon and enter a domain like `imagedelivery.net`
3. Click **Save**
4. Visit any website — images from that domain will be removed automatically

---

## 🔧 Installation (Developer Mode)

To test or install locally:

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right)
4. Click **“Load unpacked”**
5. Select the folder containing this extension's files

---

## 📁 Files

- `manifest.json` – Extension config
- `popup.html` / `popup.js` – UI to save domains or trigger removal manually
- `background.js` – Initialization logic
- `content.js` – Auto-removal logic on page load
- `camera-x-icon-*.png` – Extension icon images

---

## 💡 Example Use Case

Block all CDN-hosted images from `imagedelivery.net`, `trackingpixels.com`, or any custom image host.

---

## 🔒 Privacy

This extension runs entirely on your device. It stores settings using `chrome.storage.local` and does **not** make any external network requests.

---

## 📬 Feedback & Contributions

Feel free to open issues or submit PRs. For feedback, email or message me on GitHub.

---

## 🆓 License

MIT License — free to use, modify, or distribute.
