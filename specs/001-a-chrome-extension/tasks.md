# Tasks: Multi-AI Sidebar Extension

**Input**: Design documents from `/specs/001-a-chrome-extension/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual testing only (per constitution - load extension in browser and verify)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Extension root: Repository root (`smarter-panel/`)
- All paths are relative to repository root
- No build system—all files directly loadable

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic extension structure

- [ ] T001 Create extension icon assets using SF Symbols (export to icons/icon-16.png, icons/icon-32.png, icons/icon-48.png, icons/icon-128.png) - Use `sidebar.squares.left` or `rectangle.3.group`
- [ ] T002 [P] Create provider icon assets using SF Symbols (export to icons/providers/chatgpt.png, claude.png, gemini.png, grok.png, deepseek.png, ollama.png) - Use appropriate symbols from SF Symbols library
- [ ] T003 Create manifest.json with MV3 configuration, permissions (sidePanel, storage, contextMenus, declarativeNetRequest), host_permissions for all AI providers, commands for keyboard shortcuts, and declarative_net_request rule resources
- [ ] T004 Create rules/bypass-headers.json with 6 declarativeNetRequest rules to remove X-Frame-Options and CSP headers for ChatGPT, Claude, Gemini, Grok, DeepSeek, and Ollama

**Checkpoint**: Extension structure ready - can be loaded unpacked in browser (will show errors until background script exists)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create modules/providers.js with PROVIDERS array containing config objects for 6 AI providers (id, name, url, icon, enabled, iframeAttributes), export getProviderById() and getEnabledProviders() functions
- [ ] T006 [P] Create modules/settings.js with DEFAULT_SETTINGS object, export getSettings(), getSetting(key), saveSetting(key, value), saveSettings(settings), resetSettings() functions using chrome.storage.sync with fallback to chrome.storage.local
- [ ] T007 [P] Create modules/theme-manager.js with detectTheme(), applyTheme() functions using matchMedia API, listen for system theme changes, support 'light', 'dark', 'auto' modes
- [ ] T008 Create background/service-worker.js with chrome.runtime.onInstalled listener, create context menus ("Open in Smarter Panel" with provider submenus), configure sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
- [ ] T009 Add chrome.contextMenus.onClicked listener to background/service-worker.js to open side panel and send 'switchProvider' message when user clicks provider submenu
- [ ] T010 Add chrome.commands.onCommand listener to background/service-worker.js to handle 'open-sidebar' (open side panel) and 'open-prompt-library' (open side panel + send 'openPromptLibrary' message)

**Checkpoint**: Foundation ready - extension loads, background script runs, context menus work - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick AI Access via Sidebar (Priority: P1) 🎯 MVP

**Goal**: Enable users to quickly open an AI provider in the sidebar via toolbar icon or keyboard shortcut

**Independent Test**: Install extension, click toolbar icon or press Ctrl+Shift+S, verify sidebar opens with ChatGPT loaded and interactive

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create sidebar/sidebar.html with basic structure: provider-container div, loading indicator, error message div, provider-tabs nav (use semantic HTML, no inline styles)
- [ ] T012 [P] [US1] Create sidebar/sidebar.css with flexbox layout for full-height sidebar, provider-container taking flex:1, iframe styling (width:100%, height:100%, border:none), tabs at bottom with hover states, light and dark theme styles using [data-theme] attribute
- [ ] T013 [US1] Create sidebar/sidebar.js with init() function that calls applyTheme(), renderProviderTabs(), loadDefaultProvider(), setupMessageListener() on page load
- [ ] T014 [US1] Add renderProviderTabs() function to sidebar/sidebar.js to fetch enabled providers, create tab buttons with click handlers, append to provider-tabs nav
- [ ] T015 [US1] Add switchProvider(providerId) function to sidebar/sidebar.js to hide current iframe, create new iframe if not loaded (lazy loading), show iframe for selected provider, update active tab styling, save lastSelectedProvider to chrome.storage.sync
- [ ] T016 [US1] Add createProviderIframe(provider) function to sidebar/sidebar.js to create iframe element with provider URL, sandbox attributes, allow clipboard permissions, add load/error event listeners, append to provider-container
- [ ] T017 [US1] Add loadDefaultProvider() function to sidebar/sidebar.js to read lastSelectedProvider or defaultProvider from settings, call switchProvider() with that provider ID
- [ ] T018 [US1] Add setupMessageListener() to sidebar/sidebar.js to listen for chrome.runtime.onMessage with 'switchProvider' and 'openPromptLibrary' actions, respond with success/error
- [ ] T019 [US1] Add error handling functions showError(message) and hideError() to sidebar/sidebar.js to display user-friendly error messages in error div when provider fails to load
- [ ] T020 [US1] Add loading state management with hideLoading() function to sidebar/sidebar.js to hide loading indicator once provider iframe loads successfully

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - sidebar opens, default provider loads, tabs visible

---

## Phase 4: User Story 2 - Switch Between Multiple AI Providers (Priority: P2)

**Goal**: Enable users to switch between AI providers with independent state preservation

**Independent Test**: Open sidebar, click through all 6 provider tabs, verify each loads correctly, switch back to first provider and verify conversation is preserved

### Implementation for User Story 2

- [ ] T021 [US2] Add providerSessions Map to sidebar/sidebar.js to store providerId -> iframe element mappings for lazy loading and state preservation
- [ ] T022 [US2] Update switchProvider() in sidebar/sidebar.js to check if provider iframe already exists in providerSessions Map, if yes show it (display:block), if no create new iframe and add to Map
- [ ] T023 [US2] Add updateTabActiveState(providerId) function to sidebar/sidebar.js to remove 'active' class from all tabs, add 'active' class to selected tab based on providerId
- [ ] T024 [US2] Update renderProviderTabs() in sidebar/sidebar.js to dynamically show/hide tabs based on enabledProviders from settings (filter PROVIDERS array)
- [ ] T025 [US2] Add error isolation to createProviderIframe() in sidebar/sidebar.js to catch iframe load errors per provider, display error message for that provider only, keep other providers functional
- [ ] T026 [US2] Add chrome.storage.onChanged listener to sidebar/sidebar.js to re-render provider tabs when enabledProviders setting changes, preserve current provider if still enabled
- [ ] T027 [US2] Test and verify cookie-based authentication works by logging into ChatGPT/Claude/Gemini in regular tab, then opening each provider in sidebar and confirming no re-login required

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - all providers load, state preserved, tabs update dynamically

---

## Phase 5: User Story 3 - Save and Reuse Prompts (Priority: P3)

**Goal**: Enable users to save, organize, search, and reuse prompts via Prompt Genie interface

**Independent Test**: Open Prompt Genie tab, create 5 prompts with different categories/tags, search for specific prompt, filter by category, edit prompt, delete prompt, verify persistence after browser restart

### Implementation for User Story 3

- [ ] T028 [P] [US3] Create modules/prompt-manager.js with PromptManager class, constructor initializes db property to null and fallbackStorage to chrome.storage.local
- [ ] T029 [US3] Add init() method to PromptManager in modules/prompt-manager.js to open IndexedDB 'SmarterPanelDB' version 1, create 'prompts' object store with keyPath:'id' autoIncrement:true, create indexes on category, title, tags (multiEntry:true), createdAt
- [ ] T030 [US3] Add openDB() helper method to PromptManager in modules/prompt-manager.js to return Promise wrapping indexedDB.open() with onupgradeneeded event to create schema, handle errors with fallback
- [ ] T031 [P] [US3] Add savePrompt(prompt) method to PromptManager in modules/prompt-manager.js to validate input (title not empty, category valid, tags max 10), auto-generate timestamps, save to IndexedDB or fallback to chrome.storage.local, return { success, prompt, error }
- [ ] T032 [P] [US3] Add getPrompt(id) method to PromptManager in modules/prompt-manager.js to retrieve single prompt by ID from IndexedDB, return { success, prompt, error }
- [ ] T033 [P] [US3] Add getAllPrompts(options) method to PromptManager in modules/prompt-manager.js to query all prompts with optional filtering (category, tags), sorting (sortBy, sortOrder), pagination (limit, offset), return { success, prompts, total, error }
- [ ] T034 [P] [US3] Add searchPrompts(query) method to PromptManager in modules/prompt-manager.js to perform case-insensitive search across title, content, tags fields, return { success, prompts, error }
- [ ] T035 [P] [US3] Add deletePrompt(id) method to PromptManager in modules/prompt-manager.js to remove prompt from IndexedDB by ID, return { success, error }
- [ ] T036 [US3] Add sidebar UI for Prompt Genie tab (add button to provider-tabs in sidebar/sidebar.html with id="prompt-genie-tab", SF Symbol icon `book` or `text.book.closed`)
- [ ] T037 [US3] Create prompt library container in sidebar/sidebar.html with search bar input, category filter dropdown (All, Coding, Writing, Analysis, Custom), add-new-prompt button, prompts-grid div for displaying prompt cards
- [ ] T038 [US3] Add CSS for prompt library in sidebar/sidebar.css with grid layout for prompt cards (responsive, 2-3 columns), card styles (border, padding, hover effect), search bar and filter dropdown styling
- [ ] T039 [US3] Add openPromptLibrary() function to sidebar/sidebar.js to hide provider-container, show prompt-library-container, load and render all prompts, set prompt-genie-tab as active
- [ ] T040 [US3] Add renderPrompts(prompts) function to sidebar/sidebar.js to clear prompts-grid, create prompt card elements for each prompt (title, category, tags, excerpt), add click handler to copy prompt to clipboard, append to grid
- [ ] T041 [US3] Add handlePromptClick(promptId) function to sidebar/sidebar.js to fetch prompt content, copy to clipboard using navigator.clipboard.writeText(), show toast notification "Prompt copied!", handle errors gracefully
- [ ] T042 [US3] Add setupPromptSearch() function to sidebar/sidebar.js to add input event listener to search bar with 300ms debounce, call searchPrompts() on PromptManager, re-render filtered prompts
- [ ] T043 [US3] Add setupCategoryFilter() function to sidebar/sidebar.js to add change event listener to category dropdown, call getAllPrompts({ category }) on PromptManager, re-render filtered prompts
- [ ] T044 [US3] Add openAddPromptModal() function to sidebar/sidebar.js to show modal/form with fields for title, content textarea, category dropdown, tags input (comma-separated), save button, cancel button
- [ ] T045 [US3] Add handleSavePrompt() function to sidebar/sidebar.js to validate form inputs, create prompt object, call promptManager.savePrompt(), close modal, refresh prompts display, show success toast
- [ ] T046 [US3] Add prompt edit functionality: add edit button to prompt cards, openEditPromptModal(promptId) to pre-fill form, handleUpdatePrompt() to save changes, update UI
- [ ] T047 [US3] Add prompt delete functionality: add delete button to prompt cards, show confirmation dialog, call promptManager.deletePrompt(id), remove card from UI, show success toast
- [ ] T048 [US3] Add debounce utility function to sidebar/sidebar.js (debounce(func, wait) returns debounced function with clearTimeout logic for search optimization)
- [ ] T049 [US3] Add visual feedback for clipboard copy: create showToast(message, type) function in sidebar/sidebar.js to display temporary notification (2s duration) at top-right of sidebar, styles in sidebar/sidebar.css

**Checkpoint**: All user stories (1, 2, 3) should now be independently functional - prompts can be created, searched, filtered, edited, deleted, and persist across sessions

---

## Phase 6: User Story 4 - Customize Extension Settings (Priority: P4)

**Goal**: Enable users to configure providers, set defaults, manage data, and customize theme

**Independent Test**: Open Settings tab, disable a provider (verify tab disappears), set default provider (verify opens on next sidebar launch), export data (verify JSON file), import data (verify restoration), reset data (verify defaults)

### Implementation for User Story 4

- [ ] T050 [P] [US4] Create options/options.html with full settings page structure: provider enable/disable checkboxes, default provider dropdown, theme radio buttons (light/dark/auto), export button, import file input, reset button
- [ ] T051 [P] [US4] Create options/options.css with form layout styles, section headings, button styles, responsive design for settings page
- [ ] T052 [US4] Create options/options.js with init() function to load current settings, populate form controls, add event listeners for all settings changes
- [ ] T053 [US4] Add loadSettings() function to options/options.js to fetch settings via modules/settings.js, update UI controls (checkboxes, dropdowns, radio buttons) to match current values
- [ ] T054 [US4] Add handleProviderToggle(providerId, enabled) to options/options.js to update enabledProviders array in settings, call saveSetting('enabledProviders', updatedArray), ensure at least 1 provider remains enabled
- [ ] T055 [US4] Add handleDefaultProviderChange(providerId) to options/options.js to validate provider is in enabledProviders, call saveSetting('defaultProvider', providerId), show error if invalid
- [ ] T056 [US4] Add handleThemeChange(theme) to options/options.js to validate theme value ('light'/'dark'/'auto'), call saveSetting('theme', theme), immediately apply theme to options page
- [ ] T057 [US4] Add exportAllData() function to options/options.js to call promptManager.exportPrompts() and exportSettings(), combine into { version:1, exportDate, settings, prompts } object, create JSON Blob, trigger download as smarter-panel-export-TIMESTAMP.json
- [ ] T058 [US4] Add handleImportData() function to options/options.js to read file via FileReader, parse JSON, validate structure and version, call promptManager.importPrompts() and importSettings(), show success message with counts, handle errors gracefully
- [ ] T059 [US4] Add handleResetAllData() function to options/options.js to show confirmation dialog "This will delete all prompts and reset settings. Are you sure?", on confirm call promptManager.clearAllPrompts() and resetSettings(), reload settings UI, show success message
- [ ] T060 [US4] Add settings tab to sidebar UI (add button to provider-tabs in sidebar/sidebar.html with id="settings-tab", SF Symbol icon `gearshape`)
- [ ] T061 [US4] Add inline settings panel in sidebar/sidebar.html (lighter version of options page) with enable/disable provider toggles, default provider dropdown, theme selector, link to full options page
- [ ] T062 [US4] Add openSettingsPanel() function to sidebar/sidebar.js to hide provider-container, show settings-panel-container, load current settings, populate controls
- [ ] T063 [US4] Wire up settings changes in sidebar settings panel to save via modules/settings.js, immediately update sidebar UI when providers enabled/disabled or theme changed
- [ ] T064 [US4] Add export/import buttons to sidebar settings panel that call the same exportAllData() and handleImportData() functions from options/options.js (import module or duplicate logic)

**Checkpoint**: Settings are fully functional - users can customize all preferences, data export/import works, reset functions correctly

---

## Phase 7: User Story 5 - Context Menu Quick Access (Priority: P5)

**Goal**: Enable right-click context menu to open sidebar with selected provider

**Independent Test**: Right-click on any webpage, verify "Open in Smarter Panel" menu appears with provider submenu, click "Claude", verify sidebar opens with Claude loaded

### Implementation for User Story 5

- [ ] T065 [US5] Verify background/service-worker.js context menu creation includes all enabled providers (already implemented in T008, just test it works)
- [ ] T066 [US5] Verify chrome.contextMenus.onClicked listener in background/service-worker.js correctly opens side panel and sends switchProvider message (already implemented in T009, just test it works)
- [ ] T067 [US5] Test context menu on multiple websites to ensure it works consistently across different page types (plain HTML, SPAs, sites with frames)
- [ ] T068 [US5] Add dynamic context menu update when enabledProviders setting changes: listen to chrome.storage.onChanged in background/service-worker.js, call chrome.contextMenus.removeAll() and recreate menus with updated provider list

**Checkpoint**: All user stories (1-5) are now complete and independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, final quality assurance

- [ ] T069 [P] Add input sanitization to modules/prompt-manager.js in savePrompt() method: strip HTML tags from title/content, escape special characters, validate max lengths (title 200 chars, content 10k chars, tags 50 chars each)
- [ ] T070 [P] Add comprehensive error handling to all modules: wrap IndexedDB operations in try/catch, provide fallback to chrome.storage.local, display user-friendly error messages with recovery suggestions
- [ ] T071 [P] Add performance optimization to sidebar/sidebar.js: implement lazy iframe loading (only create iframe when user switches to provider), unload inactive iframes after 5 minutes to free memory
- [ ] T072 [P] Add virtual scrolling to prompt library if prompts.length > 100 using Intersection Observer API to render only visible prompt cards, optimize for 1,000+ prompts performance goal
- [ ] T073 [P] Add keyboard shortcuts for prompt library: arrow keys to navigate prompts, Enter to copy selected prompt, Delete to delete with confirmation, Ctrl+F to focus search
- [ ] T074 [P] Add accessibility improvements: ARIA labels for all interactive elements, keyboard navigation support (Tab key), focus indicators, screen reader announcements for actions (prompt copied, settings saved)
- [ ] T075 Add README.md update with installation instructions for Edge and Chrome, usage guide, troubleshooting section, screenshots of extension in action
- [ ] T076 Add CSP (Content Security Policy) validation in manifest.json to ensure minimal unsafe-inline/unsafe-eval usage, test extension still works with strict CSP
- [ ] T077 [P] Add logging and diagnostics: console.log extension initialization, provider switches, settings changes, errors; add version logging on install for troubleshooting
- [ ] T078 Test extension in both Edge 114+ and Chrome 114+ on Windows, macOS, Linux to verify cross-platform compatibility, document any platform-specific issues
- [ ] T079 Test extension with all 6 AI providers (ChatGPT, Claude, Gemini, Grok, DeepSeek, Ollama) to verify iframe loading, cookie-based auth works, no provider-specific bugs
- [ ] T080 Performance testing: measure sidebar open time (<2s goal), provider switch time (<1s goal), memory usage (<100MB goal), search performance with 1,000 prompts, log results
- [ ] T081 Manual regression testing: go through all user stories (US1-US5) end-to-end, verify all acceptance scenarios pass, test edge cases (storage full, provider down, corrupted import file)
- [ ] T082 Final code cleanup: remove console.log statements for production, add JSDoc comments to complex functions, ensure consistent code style (camelCase variables, 2-space indentation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2 (Prompt Genie is separate tab)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent, uses settings module
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Uses context menu from background script

### Within Each User Story

- Tasks marked [P] can run in parallel (different files)
- Tasks without [P] should run sequentially (same file or dependencies)
- Within sidebar.js: functions can be written in parallel, then integrated sequentially

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- T001 (extension icons) + T002 (provider icons) can run in parallel
- T003 (manifest) + T004 (rules) can run in parallel

**Foundational Phase (Phase 2)**:
- T005 (providers.js) + T006 (settings.js) + T007 (theme-manager.js) can run in parallel
- T008, T009, T010 (background script) must run sequentially (same file)

**User Story 1 (Phase 3)**:
- T011 (HTML) + T012 (CSS) can run in parallel
- T013-T020 (sidebar.js functions) can be written in parallel, integrated sequentially

**User Story 3 (Phase 5)**:
- T028-T035 (PromptManager methods) can be written in parallel (all in same class but different methods)
- T036-T049 (UI components) dependencies: T038 (CSS) depends on T037 (HTML), rest can be parallel

**User Story 4 (Phase 6)**:
- T050 (HTML) + T051 (CSS) can run in parallel
- T052-T064 can be written as independent functions in parallel

**Polish Phase (Phase 8)**:
- T069-T074 + T077 (code improvements) can run in parallel
- T075-T082 (testing and docs) can run in parallel

---

## Parallel Example: User Story 1 (MVP)

```bash
# Parallel tasks within US1:
# Developer A:
T011: Create sidebar/sidebar.html
T013: Create sidebar/sidebar.js scaffold
T014: Add renderProviderTabs()

# Developer B:
T012: Create sidebar/sidebar.css
T015: Add switchProvider()

# Developer C:
T016: Add createProviderIframe()
T017: Add loadDefaultProvider()

# Sequential integration:
T018: Add setupMessageListener() (depends on T013-T017 being complete)
T019: Add error handling
T020: Add loading state
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational ✅ (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T011-T020) ✅
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Install extension in browser
   - Click toolbar icon → sidebar opens
   - Verify ChatGPT loads
   - Test keyboard shortcut
   - Test provider switching between tabs
5. If US1 works → MVP complete! Can demo/deploy

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready ✅
2. Add User Story 1 (T011-T020) → Test independently → MVP! ✅
3. Add User Story 2 (T021-T027) → Test independently → Multi-provider support ✅
4. Add User Story 3 (T028-T049) → Test independently → Prompt library ✅
5. Add User Story 4 (T050-T064) → Test independently → Settings & customization ✅
6. Add User Story 5 (T065-T068) → Test independently → Context menu ✅
7. Polish (T069-T082) → Final quality pass ✅

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together ✅
2. Once Foundational is done:
   - Developer A: User Story 1 (sidebar core)
   - Developer B: User Story 3 (prompt library)
   - Developer C: User Story 4 (settings)
3. After US1 completes:
   - Developer A moves to User Story 2 (provider switching)
   - Developer B continues US3
   - Developer C continues US4
4. Developer D can start User Story 5 (context menu) anytime after Foundational
5. All developers converge on Phase 8 (Polish) when their stories complete

---

## Testing Checklist (Manual - Per Constitution)

### User Story 1 Testing

- [ ] Install extension via "Load unpacked" in chrome://extensions
- [ ] Click extension toolbar icon → sidebar opens with ChatGPT
- [ ] Press Ctrl+Shift+S → sidebar opens
- [ ] Log into ChatGPT in regular tab, open sidebar → no re-login required
- [ ] Type message in sidebar ChatGPT → AI responds
- [ ] Navigate to different browser tab → sidebar stays accessible
- [ ] Close and reopen sidebar → last provider restored

### User Story 2 Testing

- [ ] Click all 6 provider tabs → each loads correctly
- [ ] Start conversation in ChatGPT, switch to Claude, switch back → ChatGPT conversation preserved
- [ ] Open provider you're not logged into → login page appears in sidebar
- [ ] Disable internet, try to load provider → error message displayed, other providers still work
- [ ] Open Settings, disable a provider → tab disappears from sidebar

### User Story 3 Testing

- [ ] Open Prompt Genie tab → interface loads
- [ ] Click "Add New Prompt" → form appears
- [ ] Fill form (title, content, category, tags) → click Save → prompt appears in library
- [ ] Click prompt card → "Prompt copied!" toast appears, paste to verify clipboard
- [ ] Type in search bar → prompts filter in real-time
- [ ] Select category filter → only prompts in that category shown
- [ ] Click edit on prompt → form pre-filled → change content → save → updates in library
- [ ] Click delete on prompt → confirmation dialog → confirm → prompt removed
- [ ] Close browser, reopen → prompts still there (persistence test)
- [ ] Create 100 prompts → search performance still fast (<1s)

### User Story 4 Testing

- [ ] Open Settings tab → all controls load
- [ ] Toggle provider off → save → provider tab disappears
- [ ] Toggle provider on → save → provider tab reappears
- [ ] Change default provider → close sidebar → reopen → new default loads
- [ ] Select dark theme → UI switches to dark immediately
- [ ] Click Export → JSON file downloads
- [ ] Open downloaded JSON → verify structure (version, settings, prompts)
- [ ] Click Import → select file → data restored correctly
- [ ] Click Reset → confirm → all settings back to defaults, prompts deleted

### User Story 5 Testing

- [ ] Right-click on any webpage → "Open in Smarter Panel" appears
- [ ] Hover over menu → submenu shows all enabled providers
- [ ] Click "Claude" from submenu → sidebar opens with Claude loaded
- [ ] Test on multiple website types (news site, Google, GitHub) → works consistently

### Edge Cases Testing

- [ ] Test with storage full (manually fill browser storage) → error message shown
- [ ] Test with Ollama not running → error message with setup instructions
- [ ] Test import of corrupted JSON → import fails gracefully, existing data unchanged
- [ ] Test with narrow sidebar width (resize to 300px) → UI still usable
- [ ] Test with 1,000+ prompts → performance within acceptable range

### Cross-Browser Testing

- [ ] Test all features in Chrome 114+ on Windows
- [ ] Test all features in Chrome 114+ on macOS
- [ ] Test all features in Edge 114+ on Windows
- [ ] Test all features in Edge 114+ on macOS
- [ ] Document any browser-specific issues

### Performance Testing

- [ ] Measure sidebar open time → <2 seconds ✅
- [ ] Measure provider switch time → <1 second ✅
- [ ] Check memory usage (chrome://task-manager) → <100MB ✅
- [ ] Test search with 1,000 prompts → results <1 second ✅

---

## Notes

- [P] tasks = different files, no dependencies within the phase
- [Story] label (US1, US2, US3, US4, US5) maps task to specific user story for traceability
- Each user story phase is a complete, independently testable increment
- Manual testing is mandatory (constitution requirement - zero-build philosophy)
- Use SF Symbols for all icons (per user instruction)
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently before continuing
- All file paths are absolute from repository root
- No build step required - extension loads directly from source files
