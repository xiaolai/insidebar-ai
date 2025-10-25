# Changelog

All notable changes to insidebar.ai will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.0] - 2025-10-25

### Added
- **Microsoft Copilot Support**: Full integration of Microsoft Copilot as a new AI provider
  - History extraction (Save button) for both /chats/ and /pages/ URLs
  - Text injection support for sending prompts from sidebar
  - Enter key behavior customization with automatic handling of Copilot's opposite native behavior
  - Header bypass rules for iframe embedding (X-Frame-Options, CSP)
  - Support for multiple Copilot domains: copilot.microsoft.com, bing.com/chat
  - Provider icons (light and dark theme variants)

### Changed
- **Provider Order**: Moved DeepSeek to the end of providers list
- **UI Improvements**: Made popup menus responsive to content height
  - workspace-provider-popup: Now adjusts height based on number of providers
  - category-popup: Dynamic height instead of fixed 300px
  - provider-popup: Dynamic height instead of fixed 300px
  - All popups now use `calc(100vh - 200px)` for better responsiveness

### Fixed
- **Copilot Enter Key Behavior**: Properly handles Copilot's opposite native behavior
  - Copilot native: Enter = Send, Shift+Enter = Newline (opposite of ChatGPT/Claude)
  - Solution: Always preventDefault and manually handle both actions
  - Newline action: Insert '\n' at cursor position via textarea manipulation
  - Send action: Click send button programmatically

## [1.6.0] - 2025-10-19

### Added
- **Source URL Placement Setting**: User-configurable option to control where source URLs appear when sending content to AI providers
  - Choose between "At end (after content)", "At beginning (before content)", or "Don't include URL"
  - Applies to both selected text and page content extraction
  - Helps save tokens when URL is not needed
  - Full i18n support for all 10 languages

### Fixed
- Google AI Mode now appears in default enabled providers list in options page
- Test suite improvements:
  - Fixed timeout in prompt-manager tests (IndexedDB mock now triggers callbacks properly)
  - Fixed type validation to properly reject non-string content types
  - Updated providers test to correctly expect 6 providers (including Google)

## [1.3.0] - 2025-10-16

### Added
- **Claude.ai Enter Key Customization**: Full support for enter key behavior customization on Claude.ai
  - Uses window capture pattern to intercept events before ProseMirror
  - Supports all presets: Default, Swapped, Slack-style, Discord-style, Custom
  - For newline: dispatches Shift+Enter (ProseMirror native)
  - For send: clicks send button programmatically (more reliable)
- **Test Suites**: Added comprehensive tests for core utilities
  - html-utils.test.js: Tests for HTML content extraction and formatting
  - prompt-manager.test.js: Tests for prompt management operations

### Changed
- **Security Improvements**: Audit fixes for dependencies and code quality
  - Updated npm dependencies to latest secure versions
  - Removed debug console.log statements from production code
  - Optimized package-lock.json (reduced from 3336 to 1701 lines)

### Fixed
- Claude.ai enter key behavior now respects user configuration
- Removed unnecessary debug logging from Grok enter behavior handler

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

[1.7.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.7.0
[1.6.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.6.0
[1.3.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.3.0
[1.2.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.2.0
[1.1.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.1.0
[1.0.0]: https://github.com/xiaolai/insidebar-ai/releases/tag/v1.0.0
