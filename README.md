# 🤖 insidebar.ai

> A multi-AI sidebar extension for Microsoft Edge and Google Chrome

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📖 Overview

**insidebar.ai** brings together multiple AI assistants in one convenient sidebar interface. Access ChatGPT, Claude, Gemini, Grok, DeepSeek, and Ollama without leaving your current tab or juggling multiple windows.

### ✨ Key Features

- 🎯 **Multi-AI Access**: All major AI providers in one place
- 🔐 **Cookie-Based Authentication**: Uses your existing browser sessions (no API keys needed!)
- ⌨️ **Keyboard Shortcuts**: Quick access with customizable shortcuts
- 📝 **Prompt Library**: Save, organize, and reuse your favorite prompts
- 🎨 **Dark/Light Mode**: Automatic theme detection with manual override
- 🔧 **Highly Customizable**: Enable/disable providers, set defaults, and more

## 🚀 Supported AI Providers

| Provider | URL | Status |
|----------|-----|--------|
| ChatGPT | https://chat.openai.com | ✅ Supported |
| Claude | https://claude.ai | ✅ Supported |
| Gemini | https://gemini.google.com | ✅ Supported |
| Grok | https://grok.com | ✅ Supported |
| DeepSeek | https://chat.deepseek.com | ✅ Supported |
| Ollama | http://localhost:3000 | ✅ Supported (requires local setup) |

## 📦 Installation

### For Microsoft Edge

1. **Download the Extension**
   ```bash
   git clone https://github.com/xiaolai/insidebar-ai.git
   cd insidebar-ai
   ```

2. **Open Edge Extensions Page**
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" (toggle in the left sidebar)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `insidebar-ai` folder

4. **Configure (Optional)**
   - Click the extension icon to open the sidebar
   - Navigate to Settings (⚙️ tab) to customize

### For Google Chrome

1. **Download the Extension** (same as above)

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `insidebar-ai` folder

4. **Configure (Optional)**
   - Click the extension icon to open the sidebar
   - Navigate to Settings (⚙️ tab) to customize

## 🔧 Setup & Configuration

### First Time Setup

1. **Login to AI Providers**
   - Visit each AI provider's website in a regular tab
   - Log in with your credentials
   - The extension will automatically use these login sessions

2. **Configure Keyboard Shortcuts** (Optional)
   - Navigate to `chrome://extensions/shortcuts` (Chrome) or `edge://extensions/shortcuts` (Edge)
   - Customize the shortcuts for:
     - **Open insidebar.ai**: Default `Ctrl+Shift+E` (macOS: `Cmd+Shift+E`)
     - **Open Prompt Library**: Default `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)

3. **Ollama Setup** (Optional)
   - Install [Ollama](https://ollama.com/)
   - Install [Open WebUI](https://github.com/open-webui/open-webui) for Ollama
   - Run Open WebUI on `http://localhost:3000`
   - Enable Ollama in extension settings

## 📚 Usage Guide

### Opening the Sidebar

**Method 1: Keyboard Shortcut**
- Press `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (macOS)

**Method 2: Extension Icon**
- Click the insidebar.ai icon in your browser toolbar

**Method 3: Right-Click Context Menu**
- Right-click anywhere on a webpage
- Select "Open in insidebar.ai"
- Choose your preferred AI provider

### Switching Between AI Providers

Click the icon tabs at the bottom of the sidebar:
- 🤖 ChatGPT
- 💬 Claude
- ✨ Gemini
- 🚀 Grok
- 🔍 DeepSeek
- 🦙 Ollama
- ✏️ Prompt Genie
- ⚙️ Settings

### Using the Prompt Library

1. **Open Prompt Genie**
   - Click the ✏️ tab or press `Ctrl+Shift+P`

2. **Add a New Prompt**
   - Click the ➕ button
   - Fill in title, category, tags, and prompt content
   - Click "Save Prompt"

3. **Use a Saved Prompt**
   - Click on any prompt card
   - The prompt is copied to your clipboard
   - Paste it into the active AI provider

4. **Organize Prompts**
   - Use categories: Coding, Writing, Analysis, Custom
   - Add tags for better searchability
   - Search using the search bar

### Settings & Customization

1. **Open Settings**
   - Click the ⚙️ tab in the sidebar
   - Or right-click extension icon → Options

2. **Enable/Disable Providers**
   - Toggle providers on/off
   - Disabled providers won't appear in tabs

3. **Set Default Provider**
   - Choose which AI loads when opening the sidebar

4. **Data Management**
   - Export/Import settings and prompts
   - Backup your prompt library
   - Reset all data if needed

## 🎨 Project Structure

```
insidebar-ai/
├── manifest.json              # Extension manifest (MV3)
├── sidebar/
│   ├── sidebar.html          # Main sidebar UI
│   ├── sidebar.css           # Sidebar styles
│   └── sidebar.js            # Sidebar logic
├── modules/
│   ├── providers.js          # Provider configurations
│   ├── prompt-manager.js     # IndexedDB prompt storage
│   ├── settings.js           # Settings management
│   └── inject-styles.js      # CSS injection utilities
├── background/
│   └── service-worker.js     # Background service worker
├── options/
│   ├── options.html          # Full options page
│   ├── options.css           # Options page styles
│   └── options.js            # Options page logic
├── rules/
│   └── bypass-headers.json   # Header bypass rules
└── icons/
    ├── icon-16.png           # Extension icons
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-128.png
    └── providers/            # Provider icons (optional)
```

## 🔐 Security & Privacy

### Cookie-Based Authentication

- **No API Keys**: Extension uses your existing browser login sessions
- **No Data Collection**: All data stored locally in your browser
- **No External Servers**: Direct communication with AI providers only

### How It Works

1. Extension uses `declarativeNetRequest` API to bypass X-Frame-Options headers
2. AI providers load in iframes using your browser's cookies
3. You interact with the real AI websites, not copies or proxies

### Permissions Explained

| Permission | Purpose |
|------------|---------|
| `sidePanel` | Display extension in browser sidebar |
| `storage` | Save settings and prompts locally |
| `contextMenus` | Right-click menu integration |
| `declarativeNetRequest` | Bypass iframe restrictions |
| `declarativeNetRequestWithHostAccess` | Modify headers for specific domains |
| Host permissions | Access AI provider websites |

> **Optional host permissions**: When you enable a custom Ollama or other self-hosted provider, the extension prompts for `http://*/*` and `https://*/*` so Chrome can reach the URL you supply. These permissions are optional—nothing is requested unless you explicitly opt in—and the extension only touches the domains you configure.

## 🛠️ Development

### Prerequisites

- Node.js (optional, for development tools)
- Modern browser (Edge 114+ or Chrome 114+)

### Building from Source

```bash
# Clone repository
git clone https://github.com/xiaolai/insidebar-ai.git
cd insidebar-ai

# No build step required - pure JavaScript!
# Just load the extension in your browser
```

### Testing

1. Install dev dependencies (once): `npm install`
2. Run automated lint checks: `npm run lint`
3. Load the extension (see installation instructions)
4. Open DevTools: Right-click sidebar → Inspect
5. Check Console: Look for initialization messages
6. Test Providers: Switch between different AI tabs
7. Test Prompts: Create, edit, delete prompts

### Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Extension Won't Load

- **Solution**: Make sure you're using Edge 114+ or Chrome 114+
- Check browser console for errors
- Verify all files are present in the extension folder

### AI Provider Won't Load

- **Solution**: Log into the provider's website in a regular tab first
- Clear browser cache and cookies
- Check if provider changed their URL
- Verify provider is enabled in settings

### Ollama Not Working

- **Solution**: Ensure Ollama and Open WebUI are running
- Verify Open WebUI is accessible at `http://localhost:3000`
- Check Ollama URL in extension settings
- Enable Ollama in provider settings

### Keyboard Shortcuts Not Working

- **Solution**: Check `chrome://extensions/shortcuts`
- Make sure shortcuts don't conflict with other extensions
- Reassign shortcuts if needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by [Xiaolai](https://github.com/xiaolai)
- Inspired by the need for unified AI access
- Thanks to all AI providers for their amazing services

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/xiaolai/insidebar-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xiaolai/insidebar-ai/discussions)
- **Email**: support@example.com (replace with actual email)

## 🗺️ Roadmap

### Version 1.0 ✅
- [x] Multi-AI sidebar interface
- [x] Prompt library with IndexedDB
- [x] Settings management
- [x] Keyboard shortcuts
- [x] Context menu integration

### Version 1.1 (Planned)
- [ ] Webpage text extraction
- [ ] Quick send to AI (selected text)
- [ ] Multi-provider comparison mode
- [ ] Prompt templates
- [ ] Cloud sync for prompts (optional)

### Version 2.0 (Future)
- [ ] Custom workflows
- [ ] AI response history
- [ ] Browser automation integrations[text](README.md)
- [ ] Plugin system for extensibility

---

**Made with ❤️ for the AI community**
