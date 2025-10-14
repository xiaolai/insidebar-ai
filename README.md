# insidebar.ai

> Access multiple AI assistants in one convenient sidebar

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**insidebar.ai** is a browser extension that brings ChatGPT, Claude, Gemini, Grok, and DeepSeek together in a single sidebar. No more switching between tabs or windows—just open the sidebar and start chatting with your favorite AI.

## What You Get

**Multiple AI Providers in One Place**
Switch between ChatGPT, Claude, Gemini, Grok, and DeepSeek with a single click. All your AI conversations accessible from one sidebar.

**No API Keys Required**
Uses your existing browser login sessions. If you're already logged into ChatGPT or Claude, you're ready to go.

**Prompt Library**
Save your frequently used prompts. Organize them with categories and tags. Reuse them across any AI provider. Import a default library of 50+ useful prompts to get started.

**Keyboard Shortcuts**
Open the sidebar instantly with `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac). Access your prompt library with `Ctrl+Shift+P`.

**Customizable Enter Key Behavior**
Change how the Enter key works in AI chat inputs. Prefer Enter to send messages and Shift+Enter for new lines? Or vice versa? You can configure it to match your preference.

**Dark Mode Support**
Automatically matches your system theme, or choose light/dark mode manually.

**Customizable**
Enable only the AI providers you use. Set your default provider. Configure keyboard shortcuts. Everything stays in your browser—no cloud sync required.

## Supported AI Providers

| Provider | Website |
|----------|---------|
| ChatGPT | https://chat.openai.com |
| Claude | https://claude.ai |
| Gemini | https://gemini.google.com |
| Grok | https://grok.com |
| DeepSeek | https://chat.deepseek.com |

## Installation

### Self-Hosting Only

This extension is not available on the Chrome Web Store and is designed to be self-hosted.

**Why self-host?**

While this extension collects no data and respects your privacy, self-hosting gives you complete control and transparency:

- **Full source code access** - Review every line of code before installation
- **No automatic updates** - You decide when and what to update
- **Complete control** - Modify the extension to suit your needs
- **No store policies** - Avoid potential future policy changes from Chrome Web Store
- **Educational value** - Learn how browser extensions work
- **Maximum privacy** - No connection to any store or update servers

This extension is designed to be easily self-hosted. All code is vanilla JavaScript with no build process required.

**Installation Steps:**

#### Microsoft Edge

1. Download this repository (click the green "Code" button → "Download ZIP")
2. Extract the ZIP file to a folder on your computer
3. Open Edge and go to `edge://extensions/`
4. Enable "Developer mode" in the left sidebar
5. Click "Load unpacked" and select the extracted folder
6. The sidebar icon will appear in your browser toolbar

#### Google Chrome

1. Download this repository (click the green "Code" button → "Download ZIP")
2. Extract the ZIP file to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extracted folder
6. The sidebar icon will appear in your browser toolbar

**Note:** Self-hosted extensions will show a "Developer mode" warning in your browser. This is normal and does not affect functionality.

## First-Time Setup

**1. Log into your AI providers**
Visit the websites of the AI providers you want to use (ChatGPT, Claude, etc.) and log in. The extension will use these existing login sessions.

**2. Open the sidebar**
Click the extension icon in your toolbar, or press `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac).

**3. Start chatting**
Select an AI provider from the tabs at the bottom of the sidebar. The AI interface loads directly in the sidebar—same as using it in a regular tab.

**4. Configure shortcuts (optional)**
- Chrome: Go to `chrome://extensions/shortcuts`
- Edge: Go to `edge://extensions/shortcuts`
- Customize the keyboard shortcuts if the defaults don't work for you

## How to Use

### Opening the Sidebar

**Keyboard shortcut:** `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac)
**Extension icon:** Click the icon in your browser toolbar
**Right-click menu:** Right-click on any webpage → "Send to insidebar.ai" → choose a provider

### Switching AI Providers

The bottom of the sidebar shows tabs for each enabled provider. Click a tab to switch to that AI. Your sessions persist—switching back returns you to where you left off.

### Using the Prompt Library

Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) to open the Prompt Library, or click the notebook icon at the bottom of the sidebar.

**Create a prompt:**
Click "New Prompt", enter a title, content, and optional category/tags. Save it.

**Use a prompt:**
Click any prompt card to copy it to your clipboard, then paste it into the AI chat.

**Insert into workspace:**
Click the circular arrow icon on a prompt to insert it into the workspace. From there, you can compose multi-part prompts or send them to any AI provider.

**Organize prompts:**
Use categories (Coding, Writing, Analysis, or create your own). Add tags for easy searching. Filter by favorites using the star icon.

**Import default prompts:**
Open Settings and click "Import Default Prompts" to load a starter collection of 50+ useful prompts covering coding, writing, analysis, and more.

### Settings

Click the gear icon at the bottom of the sidebar to open Settings.

**Theme:** Choose Auto (follows system), Light, or Dark mode

**AI Providers:** Enable or disable specific providers. Only enabled providers appear in the sidebar tabs.

**Default Provider:** Select which AI loads when you first open the sidebar

**Keyboard Shortcuts:** Toggle shortcuts on/off, or customize them in your browser's extension settings

**Auto-Paste Clipboard:** When enabled, opening the Prompt Library automatically pastes clipboard content into the workspace

**Enter Key Behavior:** Customize how the Enter key works in AI chat inputs. Choose from presets (Default, Swapped, Slack-style, Discord-style) or create your own custom key mapping. This affects how you send messages versus adding new lines.

**Prompt Library:** Import the default prompt library containing 50+ professionally crafted prompts for coding, writing, analysis, and general use. Great starting point for new users.

**Data Management:** Export your prompts and settings as a backup file. Import them later or on another computer. Reset all data if needed.

## Privacy & Security

**Your data stays local.** All prompts and settings are stored in your browser's local storage. Nothing is sent to external servers.

**No API keys required.** The extension uses your existing browser login sessions. It loads the real AI websites in the sidebar using your cookies.

**No tracking.** The extension doesn't collect analytics, usage data, or any personal information.

**How it works:** The extension uses Chrome's `declarativeNetRequest` API to bypass X-Frame-Options headers, allowing AI provider websites to load in the sidebar iframe. This is the same security feature that extensions like password managers use.

## Troubleshooting

**The extension won't load**
Make sure you're using a recent version of Chrome (114+) or Edge (114+). Older versions don't support the required APIs.

**An AI provider won't load**
First, log into that provider's website in a regular browser tab. The extension needs an active login session. If still not working, try clearing your browser cache and cookies for that provider.

**Keyboard shortcuts don't work**
Check if another extension is using the same shortcut. Go to `chrome://extensions/shortcuts` (or `edge://extensions/shortcuts`) to see all shortcuts and change them if needed.

**The sidebar closes when I use the keyboard shortcut**
This is configurable in Settings. Some users prefer the shortcut to toggle the sidebar (open/close), while others prefer it only opens. Check "Allow shortcut to close sidebar" in Settings.

**Dark mode isn't working**
Open Settings and check the Theme dropdown. If set to "Auto", it follows your system theme. Change it to "Dark" to force dark mode.

## Support

If you encounter bugs or have feature requests, please open an issue on GitHub:
https://github.com/xiaolai/insidebar-ai/issues

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

Built by [Xiaolai](https://github.com/xiaolai)
