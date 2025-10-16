#!/bin/bash

# Smarter Panel - Icon Setup Script
# This script copies and resizes icons from Downloads to the extension directories

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎨 Smarter Panel - Icon Setup Script${NC}"
echo "======================================"
echo ""

# Check if sips command exists (macOS built-in)
if ! command -v sips &> /dev/null; then
    echo -e "${RED}❌ Error: 'sips' command not found. This script requires macOS.${NC}"
    exit 1
fi

# Define directories
DOWNLOADS="/Users/joker/Downloads"
ICON_DIR="icons"
PROVIDER_DIR="icons/providers"
PROVIDER_DARK_DIR="icons/providers/dark"
UI_DIR="icons/ui"
UI_DARK_DIR="icons/ui/dark"

# Create directories if they don't exist
mkdir -p "$ICON_DIR"
mkdir -p "$PROVIDER_DIR"
mkdir -p "$PROVIDER_DARK_DIR"
mkdir -p "$UI_DIR"
mkdir -p "$UI_DARK_DIR"

# Define source files (light versions)
MAIN_ICON="$DOWNLOADS/smarter-panel.png"
OPENAI_ICON="$DOWNLOADS/openai.png"
CLAUDE_ICON="$DOWNLOADS/claude.png"
GEMINI_ICON="$DOWNLOADS/gemini.png"
GROK_ICON="$DOWNLOADS/grok.png"
DEEPSEEK_ICON="$DOWNLOADS/deepseek.png"
OLLAMA_ICON="$DOWNLOADS/ollama.png"
SETTINGS_ICON="$DOWNLOADS/settings.png"
PROMPTS_ICON="$DOWNLOADS/prompts.png"
CHAT_HISTORY_ICON="$DOWNLOADS/chat-history.png"

# Define dark icon files (optional - will be processed if they exist)
OPENAI_DARK="$DOWNLOADS/openai-dark.png"
CLAUDE_DARK="$DOWNLOADS/claude-dark.png"
GEMINI_DARK="$DOWNLOADS/gemini-dark.png"
GROK_DARK="$DOWNLOADS/grok-dark.png"
DEEPSEEK_DARK="$DOWNLOADS/deepseek-dark.png"
OLLAMA_DARK="$DOWNLOADS/ollama-dark.png"
SETTINGS_DARK="$DOWNLOADS/settings-dark.png"
PROMPTS_DARK="$DOWNLOADS/prompts-dark.png"
CHAT_HISTORY_DARK="$DOWNLOADS/chat-history-dark.png"

# Function to check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ Error: File not found: $1${NC}"
        return 1
    fi
    return 0
}

# Function to resize and copy icon
resize_icon() {
    local source=$1
    local dest=$2
    local size=$3

    echo -e "  ${BLUE}→${NC} Creating ${size}x${size} version..."
    sips -z "$size" "$size" "$source" --out "$dest" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Created: $dest"
    else
        echo -e "  ${RED}✗${NC} Failed: $dest"
        return 1
    fi
}

echo -e "${BLUE}Step 1: Checking source files...${NC}"
echo ""

# Check all source files
FILES_MISSING=0
for file in "$MAIN_ICON" "$OPENAI_ICON" "$CLAUDE_ICON" "$GEMINI_ICON" "$GROK_ICON" "$DEEPSEEK_ICON" "$OLLAMA_ICON" "$SETTINGS_ICON" "$PROMPTS_ICON" "$CHAT_HISTORY_ICON"; do
    if check_file "$file"; then
        echo -e "${GREEN}✓${NC} Found: $(basename "$file")"
    else
        FILES_MISSING=1
    fi
done

if [ $FILES_MISSING -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Some files are missing. Please ensure all icons are in the Downloads folder.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ All source files found!${NC}"
echo ""

# Process main extension icons
echo -e "${BLUE}Step 2: Creating main extension icons...${NC}"
echo ""

if check_file "$MAIN_ICON"; then
    echo "Processing: smarter-panel.png"
    resize_icon "$MAIN_ICON" "$ICON_DIR/icon-16.png" 16
    resize_icon "$MAIN_ICON" "$ICON_DIR/icon-32.png" 32
    resize_icon "$MAIN_ICON" "$ICON_DIR/icon-48.png" 48
    resize_icon "$MAIN_ICON" "$ICON_DIR/icon-128.png" 128
    echo ""
fi

# Process provider icons (32x32 for consistency)
echo -e "${BLUE}Step 3: Creating provider icons...${NC}"
echo ""

# ChatGPT (from openai.png)
if check_file "$OPENAI_ICON"; then
    echo "Processing: openai.png → chatgpt.png"
    resize_icon "$OPENAI_ICON" "$PROVIDER_DIR/chatgpt.png" 32
    echo ""
fi

# Claude
if check_file "$CLAUDE_ICON"; then
    echo "Processing: claude.png"
    resize_icon "$CLAUDE_ICON" "$PROVIDER_DIR/claude.png" 32
    echo ""
fi

# Gemini
if check_file "$GEMINI_ICON"; then
    echo "Processing: gemini.png"
    resize_icon "$GEMINI_ICON" "$PROVIDER_DIR/gemini.png" 32
    echo ""
fi

# Grok
if check_file "$GROK_ICON"; then
    echo "Processing: grok.png"
    resize_icon "$GROK_ICON" "$PROVIDER_DIR/grok.png" 32
    echo ""
fi

# DeepSeek
if check_file "$DEEPSEEK_ICON"; then
    echo "Processing: deepseek.png"
    resize_icon "$DEEPSEEK_ICON" "$PROVIDER_DIR/deepseek.png" 32
    echo ""
fi

# Ollama
if check_file "$OLLAMA_ICON"; then
    echo "Processing: ollama.png"
    resize_icon "$OLLAMA_ICON" "$PROVIDER_DIR/ollama.png" 32
    echo ""
fi

# Process UI icons (for local functions)
echo -e "${BLUE}Step 4: Creating UI icons...${NC}"
echo ""

# Settings icon
if check_file "$SETTINGS_ICON"; then
    echo "Processing: settings.png"
    resize_icon "$SETTINGS_ICON" "$UI_DIR/settings.png" 32
    echo ""
fi

# Prompts icon
if check_file "$PROMPTS_ICON"; then
    echo "Processing: prompts.png"
    resize_icon "$PROMPTS_ICON" "$UI_DIR/prompts.png" 32
    echo ""
fi

# Chat history icon
if check_file "$CHAT_HISTORY_ICON"; then
    echo "Processing: chat-history.png"
    resize_icon "$CHAT_HISTORY_ICON" "$UI_DIR/chat-history.png" 32
    echo ""
fi

# Process dark provider icons (optional - only if files exist)
echo -e "${BLUE}Step 5: Creating dark provider icons (optional)...${NC}"
echo ""

DARK_ICONS_FOUND=0

# ChatGPT dark
if [ -f "$OPENAI_DARK" ]; then
    echo "Processing: openai-dark.png → chatgpt.png"
    resize_icon "$OPENAI_DARK" "$PROVIDER_DARK_DIR/chatgpt.png" 32
    DARK_ICONS_FOUND=1
    echo ""
fi

# Claude dark
if [ -f "$CLAUDE_DARK" ]; then
    echo "Processing: claude-dark.png"
    resize_icon "$CLAUDE_DARK" "$PROVIDER_DARK_DIR/claude.png" 32
    DARK_ICONS_FOUND=1
    echo ""
fi

# Gemini dark
if [ -f "$GEMINI_DARK" ]; then
    echo "Processing: gemini-dark.png"
    resize_icon "$GEMINI_DARK" "$PROVIDER_DARK_DIR/gemini.png" 32
    DARK_ICONS_FOUND=1
    echo ""
fi

# Grok dark
if [ -f "$GROK_DARK" ]; then
    echo "Processing: grok-dark.png"
    resize_icon "$GROK_DARK" "$PROVIDER_DARK_DIR/grok.png" 32
    DARK_ICONS_FOUND=1
    echo ""
fi

# DeepSeek dark
if [ -f "$DEEPSEEK_DARK" ]; then
    echo "Processing: deepseek-dark.png"
    resize_icon "$DEEPSEEK_DARK" "$PROVIDER_DARK_DIR/deepseek.png" 32
    DARK_ICONS_FOUND=1
    echo ""
fi

# Ollama dark
if [ -f "$OLLAMA_DARK" ]; then
    echo "Processing: ollama-dark.png"
    resize_icon "$OLLAMA_DARK" "$PROVIDER_DARK_DIR/ollama.png" 32
    DARK_ICONS_FOUND=1
    echo ""
fi

if [ $DARK_ICONS_FOUND -eq 0 ]; then
    echo -e "${BLUE}ℹ${NC}  No dark provider icons found (optional)"
    echo ""
fi

# Process dark UI icons (optional - only if files exist)
echo -e "${BLUE}Step 6: Creating dark UI icons (optional)...${NC}"
echo ""

DARK_UI_FOUND=0

# Settings dark
if [ -f "$SETTINGS_DARK" ]; then
    echo "Processing: settings-dark.png"
    resize_icon "$SETTINGS_DARK" "$UI_DARK_DIR/settings.png" 32
    DARK_UI_FOUND=1
    echo ""
fi

# Prompts dark
if [ -f "$PROMPTS_DARK" ]; then
    echo "Processing: prompts-dark.png"
    resize_icon "$PROMPTS_DARK" "$UI_DARK_DIR/prompts.png" 32
    DARK_UI_FOUND=1
    echo ""
fi

# Chat history dark
if [ -f "$CHAT_HISTORY_DARK" ]; then
    echo "Processing: chat-history-dark.png"
    resize_icon "$CHAT_HISTORY_DARK" "$UI_DARK_DIR/chat-history.png" 32
    DARK_UI_FOUND=1
    echo ""
fi

if [ $DARK_UI_FOUND -eq 0 ]; then
    echo -e "${BLUE}ℹ${NC}  No dark UI icons found (optional)"
    echo ""
fi

# Summary
echo "======================================"
echo -e "${GREEN}✅ Icon setup complete!${NC}"
echo ""
echo "Created icons:"
echo "  Main extension icons:"
echo "    - icons/icon-16.png"
echo "    - icons/icon-32.png"
echo "    - icons/icon-48.png"
echo "    - icons/icon-128.png"
echo ""
echo "  Provider icons:"
echo "    - icons/providers/chatgpt.png"
echo "    - icons/providers/claude.png"
echo "    - icons/providers/gemini.png"
echo "    - icons/providers/grok.png"
echo "    - icons/providers/deepseek.png"
echo "    - icons/providers/ollama.png"
echo ""
echo "  UI icons:"
echo "    - icons/ui/settings.png"
echo "    - icons/ui/prompts.png"
echo "    - icons/ui/chat-history.png"

if [ $DARK_ICONS_FOUND -eq 1 ] || [ $DARK_UI_FOUND -eq 1 ]; then
    echo ""
    echo "  Dark theme variants:"
    [ $DARK_ICONS_FOUND -eq 1 ] && echo "    - icons/providers/dark/* (provider icons)"
    [ $DARK_UI_FOUND -eq 1 ] && echo "    - icons/ui/dark/* (UI icons)"
fi

echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "  1. Reload the extension in Chrome/Edge"
echo "  2. Verify icons appear correctly"
echo "  3. Test the extension functionality"
if [ $DARK_ICONS_FOUND -eq 0 ] && [ $DARK_UI_FOUND -eq 0 ]; then
    echo ""
    echo -e "${BLUE}💡 Tip:${NC} To add dark theme icons, place *-dark.png files in Downloads"
    echo "  and run this script again. Dark icons will be automatically detected."
fi
echo ""
echo -e "${GREEN}🚀 Ready to use Smarter Panel!${NC}"
