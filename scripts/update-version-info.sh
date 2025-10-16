#!/bin/bash
# Script to update version-info.json with latest commit hash
# Run this after committing changes before pushing

COMMIT_HASH=$(git log -1 --format="%h")
BUILD_DATE=$(git log -1 --format="%cd" --date=format:"%Y-%m-%d")
VERSION_FILE="data/version-info.json"

# Read current version from version-info.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$VERSION_FILE" | cut -d'"' -f4)

# Update version-info.json
cat > "$VERSION_FILE" << EOF
{
  "version": "$CURRENT_VERSION",
  "commitHash": "$COMMIT_HASH",
  "buildDate": "$BUILD_DATE"
}
EOF

echo "Updated $VERSION_FILE:"
echo "  Version: $CURRENT_VERSION"
echo "  Commit: $COMMIT_HASH"
echo "  Date: $BUILD_DATE"
