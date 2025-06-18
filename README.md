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
4. Click **"Load unpacked"**
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
- Bumps the version in `manifest.json` and `package.json` according to the label.
- Commits and pushes the version bump.
- Creates a zip file containing only the extension files needed for release.
- Publishes a GitHub release with the zip file attached.
