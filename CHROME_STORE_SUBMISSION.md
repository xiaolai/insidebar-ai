# Chrome Web Store Submission Guide

## Package Information

**File:** `insidebar-ai-v1.2.0.zip` (95KB)
**Version:** 1.2.0
**Manifest Version:** 3

---

## Step-by-Step Submission

### 1. Go to Chrome Web Store Developer Dashboard

Visit: https://chrome.google.com/webstore/devconsole

### 2. Create New Item

Click the **"New Item"** button and upload `insidebar-ai-v1.2.0.zip`

---

## Store Listing Details

### Basic Information

**Extension Name:**
```
insidebar.ai
```

**Summary (132 characters max):**
```
Access ChatGPT, Claude, Gemini, Grok, and DeepSeek in one sidebar with prompt library and customizable shortcuts.
```

**Category:**
```
Productivity
```

**Language:**
```
English (United States)
```

---

### Description

```
Access multiple AI assistants in one convenient sidebar

insidebar.ai brings ChatGPT, Claude, Gemini, Grok, and DeepSeek together in a single browser sidebar. No more switching between tabs or windows—just open the sidebar and start chatting with your favorite AI.

KEY FEATURES

• Multiple AI Providers in One Place
Switch between ChatGPT, Claude, Gemini, Grok, and DeepSeek with a single click.

• No API Keys Required
Uses your existing browser login sessions. Already logged into ChatGPT? You're ready to go.

• Prompt Library
Save frequently used prompts with categories and tags. Import 50+ professionally crafted prompts to get started.

• Keyboard Shortcuts
Open sidebar with Ctrl+Shift+E (Cmd+Shift+E on Mac). Access prompt library with Ctrl+Shift+P.

• Customizable Enter Key
Choose how Enter and Shift+Enter work in AI chats. Presets: Default, Swapped, Slack-style, Discord-style, or custom.

• Dark Mode Support
Automatically matches system theme or choose manually.

• Privacy-First
All data stored locally in your browser. No external servers. No tracking.

GETTING STARTED

1. Install the extension
2. Log into your preferred AI providers in regular browser tabs
3. Click the extension icon or press Ctrl+Shift+E to open the sidebar
4. Start chatting with any AI provider

SUPPORTED AI PROVIDERS

• ChatGPT (chat.openai.com)
• Claude (claude.ai)
• Gemini (gemini.google.com)
• Grok (grok.com)
• DeepSeek (chat.deepseek.com)

Open source and MIT licensed. View source code at:
https://github.com/xiaolai/insidebar-ai
```

---

### Graphics Assets

**Extension Icon:**
- Already included in the ZIP: `icons/icon-128.png`

**Screenshots Required (1280x800 pixels):**

You need to create 3-5 screenshots. Recommended screenshots:

1. **Main Interface** - Sidebar open with ChatGPT or Claude loaded
2. **Provider Tabs** - Show the bottom navigation with all AI provider tabs
3. **Prompt Library** - Show the prompt library with saved prompts
4. **Settings Page** - Show the options/settings page
5. **Dark Mode** (optional) - Show dark theme in action

**How to capture screenshots:**
1. Load the extension in Chrome
2. Open the sidebar (Ctrl+Shift+E)
3. Use a screenshot tool to capture 1280x800 images
4. Make sure to show clean, professional UI states

**Small Promotional Tile (440x280 - Optional):**
- Recommended for better visibility in the store
- Can be created later if needed

---

### Privacy Practices

**Single Purpose Description:**
```
Provides unified access to multiple AI chat services in a browser sidebar with local prompt management.
```

**Permissions Justification:**

| Permission | Justification |
|------------|---------------|
| `sidePanel` | Required to display the extension interface in the browser's side panel |
| `storage` | Required to save user settings and prompt library locally |
| `contextMenus` | Required to add right-click menu options for quick access |
| `declarativeNetRequest` | Required to modify HTTP headers so AI provider websites can load in iframe |
| `declarativeNetRequestWithHostAccess` | Required to apply header modifications to specific AI provider domains |
| Host permissions for AI providers | Required to load AI provider websites (ChatGPT, Claude, Gemini, Grok, DeepSeek) in the sidebar iframe |

**Data Usage Disclosure:**

Select: **"This item does not collect or use user data"**

Additional notes if required:
```
This extension does not collect, transmit, or share any user data. All settings and prompts are stored locally in the browser using the Chrome Storage API. No analytics, tracking, or external communication occurs.
```

**Data Handling:**
- No data collection
- No data transmission
- All data stored locally
- No third-party services

---

### Additional Information

**Homepage URL:**
```
https://github.com/xiaolai/insidebar-ai
```

**Support URL:**
```
https://github.com/xiaolai/insidebar-ai/issues
```

**Official URL (optional):**
```
https://github.com/xiaolai/insidebar-ai
```

---

### Distribution

**Visibility:**
```
Public
```

**Regions:**
```
All regions (default)
```

**Pricing:**
```
Free
```

---

## Review Process

### What Happens Next

1. **Automated Review:** Chrome will scan your extension for policy violations (a few minutes)
2. **Manual Review:** Google reviewers will test your extension (1-3 days typically)
3. **Status Updates:** Check your email and developer dashboard for updates

### Common Rejection Reasons to Avoid

✅ **You're good on these:**
- Clear single purpose ✓
- No obfuscated code ✓
- Proper permission justifications ✓
- No data collection ✓
- Open source ✓

⚠️ **Watch out for:**
- Make sure all permissions are justified in the form
- Ensure screenshots clearly show the extension's functionality
- Description matches actual functionality

### After Approval

- Extension will be live within a few hours
- You can update it anytime (updates also require review)
- Monitor user reviews and questions

---

## Quick Checklist

Before submitting:

- [ ] ZIP file uploaded (`insidebar-ai-v1.2.0.zip`)
- [ ] Extension name set to "insidebar.ai"
- [ ] Summary filled (132 char limit)
- [ ] Full description pasted
- [ ] Category set to "Productivity"
- [ ] 3-5 screenshots uploaded (1280x800)
- [ ] Extension icon verified (128x128)
- [ ] Privacy practices filled
- [ ] Permission justifications provided
- [ ] Homepage URL added
- [ ] Support URL added
- [ ] Set to "Public"
- [ ] Set to "Free"

---

## Need Help?

- Chrome Web Store Developer Documentation: https://developer.chrome.com/docs/webstore/
- Program Policies: https://developer.chrome.com/docs/webstore/program-policies/

---

## Your Package Location

The submission package is ready at:
```
/Users/joker/github/xiaolai/myprojects/browser-extentions/insidebar-ai/insidebar-ai-v1.2.0.zip
```

Good luck with your submission! 🚀
