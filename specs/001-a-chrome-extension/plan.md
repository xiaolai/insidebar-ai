# Implementation Plan: Multi-AI Sidebar Extension

**Branch**: `001-a-chrome-extension` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-a-chrome-extension/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Chrome/Edge browser extension (Manifest V3) that provides quick access to multiple AI providers (ChatGPT, Claude, Gemini, Grok, DeepSeek, Ollama) through a browser sidebar panel. The extension uses cookie-based authentication to load AI providers in iframes without requiring re-login, allows users to switch between providers while maintaining independent session state, and includes a prompt library for saving and reusing prompts across providers. All data is stored locally (IndexedDB + chrome.storage) with no external data transmission. The extension follows a zero-build philosophy using pure JavaScript ES6+ and is directly loadable without transpilation or bundling.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript ES6+ (native browser support)
**Primary Dependencies**: None (zero-build philosophy—pure JavaScript)
**Storage**: chrome.storage.local, chrome.storage.sync, IndexedDB
**Testing**: Manual browser testing (Edge 114+, Chrome 114+)
**Target Platform**: Chrome/Edge Browser Extension (Manifest V3)
**Project Type**: Browser Extension (MV3)
**Performance Goals**: <1s extension initialization, <100ms UI interactions, <100MB memory
**Constraints**: Zero-build (no transpilation), local-only data, MV3 compliance, store guidelines
**Scale/Scope**: Single-user local extension, 1000+ prompts supported, 6+ AI providers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Privacy-First Architecture**: ✅ All data stored locally (IndexedDB, chrome.storage). No external servers. Cookie-based auth only.
- [x] **Manifest V3 Compliance**: ✅ Uses declarativeNetRequest for header bypass, service workers for background, sidePanel API.
- [x] **Zero-Build Philosophy**: ✅ Pure JavaScript ES6+, no transpilation, no bundler, direct load unpacked.
- [x] **Graceful Degradation**: ✅ Error handling for provider failures, storage errors, network issues (FR-038 to FR-042).
- [x] **Modular Provider Architecture**: ✅ Provider config objects in modules/providers.js, isolated customizations.
- [x] **Security**: ✅ CSP in manifest, input sanitization in prompt library, minimal host permissions, HTTPS only.
- [x] **Performance**: ✅ SC-001: <2s sidebar open, SC-002: <1s provider switch, SC-006: <100MB memory, SC-011: <1s init.
- [x] **Compatibility**: ✅ Edge 114+, Chrome 114+, cross-platform (Windows, macOS, Linux via browser).

**Gate Status**: ✅ PASSED - All constitutional principles satisfied by feature specification.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# Chrome Extension (Manifest V3) Structure
smarter-panel/
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
│   └── bypass-headers.json   # Header bypass rules (declarativeNetRequest)
└── icons/
    ├── icon-16.png           # Extension icons
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-128.png
    └── providers/            # Provider icons
```

**Structure Decision**: Browser extension follows standard MV3 organization. No build system—all files directly loadable. Testing is manual (load unpacked in browser).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitutional principles are satisfied by this feature design.

---

## Planning Artifacts Generated

### Phase 0: Research (Complete)

- ✅ **research.md** - Technical research covering 10 key decisions:
  1. Side Panel API usage
  2. declarativeNetRequest for iframe embedding
  3. IndexedDB for prompt storage
  4. Provider configuration architecture
  5. chrome.storage for settings
  6. Service worker for background tasks
  7. Clipboard API for prompt copying
  8. Theme detection with matchMedia
  9. Three-tier error handling strategy
  10. Performance optimization (lazy loading, debouncing, virtual scrolling)

### Phase 1: Design (Complete)

- ✅ **data-model.md** - Data entities and storage schemas:
  - Entity 1: Prompt (IndexedDB with indexes)
  - Entity 2: AI Provider Configuration (code-based)
  - Entity 3: User Settings (chrome.storage.sync)
  - Entity 4: Provider Session State (in-memory)
  - Storage capacity planning (1,000+ prompts supported)
  - Security considerations (input sanitization, origin-scoped storage)

- ✅ **contracts/messaging-api.md** - Internal message passing contracts:
  - 9 message types for background ↔ sidebar ↔ options communication
  - Standardized error codes
  - Request/response patterns
  - Validation and rate limiting

- ✅ **contracts/storage-api.md** - Storage operation interfaces:
  - Prompt CRUD operations (save, get, search, delete, import, export)
  - Settings management (get, save, reset, export, import)
  - Combined export/import for full data portability
  - Error handling with fallback behavior

- ✅ **quickstart.md** - Developer onboarding guide:
  - Step-by-step setup instructions
  - Complete code examples for manifest.json, service worker, sidebar UI
  - Load and test procedures
  - Troubleshooting guide

### Phase 1: Agent Context Update (Complete)

- ✅ **CLAUDE.md** - Updated with project technology stack:
  - Language: JavaScript ES6+ (native browser support)
  - Framework: None (zero-build philosophy)
  - Database: chrome.storage, IndexedDB
  - Project type: Browser Extension (MV3)

---

## Ready for Implementation

The implementation plan is **complete** and ready for task breakdown via `/speckit.tasks`.

All artifacts have been validated against:
- ✅ Feature specification requirements
- ✅ Constitutional principles
- ✅ MV3 compliance
- ✅ Zero-build philosophy
- ✅ Privacy-first architecture
