# Prompt Library Import Instructions

## Quick Import via Settings (Recommended)

1. **Reload Extension**: Go to `chrome://extensions/` and click Reload on insidebar.ai
2. **Open Settings**: Right-click extension icon → Options
3. **Scroll to "Default Prompt Libraries"** section
4. **Click "Import All Default Prompts"** button
5. **Done!** You should see "Successfully imported X prompts" message

## Alternative: Import via Console

If the Settings UI doesn't work, you can import manually:

1. Open the extension's Options page
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Paste and run this code:

```javascript
// Import combined library (all 153 prompts)
(async () => {
  const { importDefaultLibrary } = await import(chrome.runtime.getURL('modules/prompt-manager.js'));

  const response = await fetch(chrome.runtime.getURL('data/prompt-libraries/combined.json'));
  const libraryData = await response.json();

  const result = await importDefaultLibrary(libraryData);
  console.log(`Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.error('Import errors:', result.errors);
  }
})();
```

## Library Contents

### AI Workflows & General Tasks (106 prompts)
- Prompt refinement and upgrading
- Code generation and review
- Writing assistance
- Testing and debugging
- Planning and strategy
- Documentation
- And more...

### Research & Analysis (49 prompts)
- Academic reading and comprehension
- Fact-checking and verification
- Citation management
- Evidence synthesis
- Literature review
- Research methodology
- And more...

### Combined (153 unique prompts)
All prompts from both libraries, deduplicated by externalId.

## Troubleshooting

### "Failed to import" error
- Make sure the extension is properly reloaded
- Check that the JSON files exist in `data/prompt-libraries/`
- Verify `web_accessible_resources` is set in manifest.json

### Buttons show "Already Imported"
- This is normal if prompts are already in your library
- The system prevents duplicate imports based on externalId
- You can safely re-import without creating duplicates

### No prompts showing in library
- Open Prompt Library tab in the sidebar
- Check the category filter (set to "All Categories")
- Try searching for a prompt to verify they exist

## Features After Import

Once imported, you'll have access to:

- **Quick Access Panel**: Recently used and top favorites
- **Smart Insertion**: Insert prompts into workspace with proper formatting
- **Usage Tracking**: See how often you use each prompt
- **Enhanced Sorting**: Sort by recent, most used, A-Z, or newest
- **Category Filtering**: Browse by category
- **Full-text Search**: Search across titles, content, and tags
