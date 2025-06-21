# 🧹 Custom Image Remover – Chrome Extension

This lightweight Chrome extension automatically removes images from web pages based on website-specific image domain settings.

## 🚀 Features

- 🌐 **Website-specific settings**: Configure different image domains for different websites
- 🔧 Add multiple image host domains per website (e.g. `imagedelivery.net`, `ads.com`)
- 🧼 Removes matching images **automatically on page load**
- 🖱️ Manual trigger via popup button for immediate removal
- 🧠 Remembers your preferences between sessions
- ✅ Privacy-first: No server, no tracking, no data collection
- 🔄 **Backward compatible**: Existing users' settings are automatically migrated

---

## 🛠 How It Works

1. Install the extension in Chrome
2. Click the extension icon to open the popup
3. Click **"Add Website"** to create a new website entry
4. Enter the website domain (e.g., `example.com`)
5. Add image domains you want to remove (e.g., `cdn.example.com`, `ads.com`)
6. Click **"+"** to add more image domains or **"×"** to remove them
7. Visit the configured website — images from those domains will be removed automatically

---

## 🎨 New UI Features

- **Modern interface** with clean, intuitive design
- **Dynamic website management**: Add/remove websites and image domains
- **Real-time feedback**: Status messages for all actions
- **Responsive design**: Works well on different screen sizes
- **Visual indicators**: Clear buttons for adding/removing items

---

## 🔧 Installation (Developer Mode)

To test or install locally:

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right)
4. Click **"Load unpacked"**
5. Select the folder containing this extension's files

---

## 📁 Files

- `manifest.json` – Extension config
- `popup.html` / `popup.js` – Modern UI for website and domain management
- `background.js` – Initialization logic
- `content.js` – Auto-removal logic on page load
- `camera-x-icon-*.png` – Extension icon images

---

## 💡 Example Use Cases

- **News sites**: Remove ad images from `ads.example.com` while keeping content images
- **Social media**: Block tracking pixels from `tracking.example.com`
- **E-commerce**: Remove promotional images from `promo.example.com` but keep product images
- **Multiple sites**: Different settings for different websites

---

## 🔄 Migration from Previous Version

If you're upgrading from the previous version:
- Your existing image domain settings will be automatically migrated
- The old single-domain setting becomes a website entry with domain "all_websites"
- You can now add more specific website configurations

---

## 🔒 Privacy

This extension runs entirely on your device. It stores settings using `chrome.storage.local` and does **not** make any external network requests.

---

## 📬 Feedback & Contributions

Feel free to open issues or submit PRs. For feedback, email or message me on GitHub.

---

## 🆓 License

MIT License — free to use, modify, or distribute.

## Development
- `npm install` to install dependencies
- `npm run lint` to lint code
- `npm test` to run all tests

### Developer Setup: Pre-commit Hook for ESLint
This project uses [pre-commit](https://pre-commit.com/) to automatically lint and fix JavaScript files before every commit.

**To set up the pre-commit hook:**
1. Install pre-commit (if you don't have it):
   - With pip: `pip install pre-commit`
   - Or with Homebrew: `brew install pre-commit`
2. In your project root, run:
   ```sh
   pre-commit install
   ```
3. Now, every time you commit, ESLint will automatically fix and lint your JS files.

## Testing
- Unit and integration tests are in the `tests/` directory
- Run all tests: `npm test`
- Run only unit tests: `npm run test:unit`
- Run only integration tests: `npm run test:integration`

## GitHub Actions Workflows

### PR Build
- Every pull request triggers a workflow that installs dependencies, lints, and runs all tests.

### Release Workflow
- On every push to the `main` branch, a release workflow runs.
- **A version label is required for the workflow to succeed.**

#### How to Add a Version Label for a Release
1. **Open your Pull Request** on GitHub.
2. In the right sidebar, find the **Labels** section.
3. Click the gear/edit icon or the "Labels" dropdown.
4. Select one of the following labels (or create them if they don't exist):
    - `version:major`
    - `version:minor`
    - `version:patch`
5. Merge the PR as usual.

> **Note:** If you do not add one of these labels, the release workflow will fail and notify you.

#### What the Release Workflow Does
- Bumps the version in `manifest.json` and `package.json` according to the label, **only in the build artifacts** (not committed to the repository).
- Creates a zip file containing only the extension files needed for release.
- Publishes a GitHub release with the zip file attached.
