#!/bin/bash
# Git commit-msg hook: appends review snippet from .cursor/review-append.txt
# to the commit message body. Same content as the ticket review, but condensed.
#
# Install: copy to .git/hooks/commit-msg and chmod +x
# Or add to pre-commit config with stage: commit-msg

REVIEW_FILE=".cursor/review-append.txt"
# Git passes the commit message file path as first argument
COMMIT_MSG_FILE="$1"

if [ ! -f "$REVIEW_FILE" ]; then
  exit 0
fi

# Append blank line + review content to commit message
echo "" >> "$COMMIT_MSG_FILE"
echo "---" >> "$COMMIT_MSG_FILE"
cat "$REVIEW_FILE" >> "$COMMIT_MSG_FILE"

# Remove the file so it's not reused for the next commit
rm -f "$REVIEW_FILE"

exit 0
