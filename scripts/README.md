# Build Scripts

## update-version-info.sh

Updates `data/version-info.json` with the latest commit hash from git.

**Usage:**

```bash
# After making code changes and committing:
git add .
git commit -m "Your commit message"

# Run this script to update version-info.json
./scripts/update-version-info.sh

# Then commit the updated version-info.json
git add data/version-info.json
git commit -m "Update version-info.json to commit $(git log -1 --format='%h')"

# Finally push
git push
```

**Why this is needed:**

The version check feature compares the bundled commit hash in `data/version-info.json` with the latest commit on GitHub. This file must be updated with each release so users can see if a newer version is available.

**Automated workflow (recommended):**

You can use a post-commit hook to automate this. Create `.git/hooks/post-commit`:

```bash
#!/bin/bash
./scripts/update-version-info.sh
git add data/version-info.json
git commit --amend --no-edit
```

Then make it executable:
```bash
chmod +x .git/hooks/post-commit
```

This will automatically update version-info.json and amend it to your commit.
