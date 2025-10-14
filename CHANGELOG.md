# Changelog

All notable changes to insidebar.ai will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-14

### Added
- **Prompt Genie (Prompt Library)**: Full-featured prompt management system
  - Save, edit, delete, and organize prompts with categories and tags
  - Search and filter prompts by text, category, or favorites
  - Import/export prompt libraries (JSON format)
  - Quick Access panel showing recently used and top favorite prompts
  - Workspace for editing prompts with send-to-provider functionality
  - Default prompt library with 50+ curated prompts
- **Keyboard Shortcuts**:
  - `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Windows/Linux): Toggle sidebar
  - `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows/Linux): Open Prompt Library
- **Auto-paste Clipboard**: Automatically paste clipboard content when opening sidebar
- **Enter Key Behavior Customization**: Configure Enter vs Shift+Enter behavior for each provider
  - Multiple presets: Default, Swapped, Slack-style, Discord-style, Custom
  - Provider-specific content scripts for ChatGPT, Gemini, Grok, DeepSeek, Perplexity
- **Material Symbols Icons**: Migrated from UTF-8 characters to professional icon font
  - Consistent cross-platform rendering
  - Theme-adaptive with automatic dark mode support
  - Variable font technology for dynamic adjustments

### Changed
- Improved settings page UI with better organization
- Enhanced provider tab navigation with consistent icon sizes
- Optimized IndexedDB operations with retry logic and better error handling
- Updated context menu to dynamically reflect enabled providers

### Fixed
- IndexedDB DataError when category filter has invalid parameters
- Side panel toggle state tracking across multiple windows
- Icon size consistency throughout the UI (28px modals, 20px workspace, 18px filters)
- Modal button visibility and styling

## [1.1.0] - 2025-01-10

### Added
- Context menu integration: Right-click to send selected text to AI providers
- Settings page for managing enabled providers and default provider
- Provider enable/disable toggles
- Theme selection (Auto/Light/Dark)

### Changed
- Improved error handling for iframe loading
- Better cookie-based authentication reliability

### Fixed
- Provider switching issues in side panel
- Theme detection for system preferences

## [1.0.0] - 2025-01-05

### Added
- Initial release of insidebar.ai
- Multi-AI provider support: ChatGPT, Claude, Gemini, Grok, DeepSeek
- Side panel interface for Chrome/Edge
- Cookie-based authentication (no API keys required)
- Provider tab navigation
- Basic settings management
- Dark/Light theme support with auto-detection

### Security
- Content Security Policy configured
- declarativeNetRequest for header bypass
- No external data collection or transmission

---

## Roadmap

### Version 1.3 (Planned)
- [ ] Perplexity provider integration in main sidebar
- [ ] Prompt templates with variable substitution
- [ ] Batch prompt execution across multiple providers
- [ ] Enhanced search with fuzzy matching
- [ ] Prompt usage analytics

### Version 2.0 (Future)
- [ ] Cloud sync for prompts (optional)
- [ ] Custom workflows and automation
- [ ] AI response history and comparison
- [ ] Plugin system for extensibility
- [ ] Firefox support

---

[1.2.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.2.0
[1.1.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.1.0
[1.0.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.0.0
